import { QueryCommand, PutCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { rlthAwsFoundation } from "../rlth-aws-foundation";
import { getDynamoDocumentClient } from "./aws-runtime";
import type { EhrActor } from "./auth";
import type { DocumentMetadata } from "./domain-model";

export type ClinicalRecordInput = {
  clientId: string;
  recordType: string;
  /**
   * Supply a recordId to update an existing record.
   * Omit (or pass undefined) to create a new record with a generated ID.
   */
  recordId?: string;
  payload: Record<string, unknown>;
  status?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Clinical Records
// ---------------------------------------------------------------------------

export async function listClinicalRecords(clientId: string, limit = 50) {
  const dynamo = getDynamoDocumentClient();
  const response = await dynamo.send(
    new QueryCommand({
      TableName: rlthAwsFoundation.clinicalRecordsTableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :recordPrefix)",
      ExpressionAttributeValues: {
        ":pk": `CLIENT#${clientId}`,
        ":recordPrefix": "RECORD#",
      },
      ScanIndexForward: false,
      Limit: Math.min(Math.max(limit, 1), 100),
    })
  );

  return response.Items || [];
}

/**
 * Create or update a clinical record.
 *
 * - No recordId supplied → creates a new item using PutItem with a
 *   condition that prevents accidental overwrites.
 * - recordId supplied → updates the existing item in place using UpdateItem,
 *   setting updatedAt, status, and payload. The original createdAt and
 *   createdBy fields are preserved.
 */
export async function putClinicalRecord(actor: EhrActor, input: ClinicalRecordInput) {
  const dynamo = getDynamoDocumentClient();
  const now = nowIso();
  const recordType = input.recordType || "clinical-note";

  // ---- UPDATE path --------------------------------------------------------
  if (input.recordId) {
    const pk = `CLIENT#${input.clientId}`;
    const sk = `RECORD#${recordType}#${input.recordId}`;

    await dynamo.send(
      new UpdateCommand({
        TableName: rlthAwsFoundation.clinicalRecordsTableName,
        Key: { PK: pk, SK: sk },
        // Require the item to already exist — prevents silent creates via update.
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
        UpdateExpression:
          "SET #payload = :payload, #status = :status, updatedAt = :now, " +
          "updatedBy = :updatedBy, updatedByName = :updatedByName",
        ExpressionAttributeNames: {
          "#payload": "payload",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":payload": input.payload,
          ":status": input.status || "draft",
          ":now": now,
          ":updatedBy": actor.sub,
          ":updatedByName": actor.name,
        },
      })
    );

    return {
      PK: pk,
      SK: sk,
      recordId: input.recordId,
      recordType,
      clientId: input.clientId,
      practiceId: actor.practiceId,
      status: input.status || "draft",
      payload: input.payload,
      updatedAt: now,
      updatedBy: actor.sub,
      updatedByName: actor.name,
    };
  }

  // ---- CREATE path --------------------------------------------------------
  const recordId = makeId("record");
  const item = {
    PK: `CLIENT#${input.clientId}`,
    SK: `RECORD#${recordType}#${recordId}`,
    GSI1PK: `PRACTICE#${actor.practiceId}#TYPE#${recordType}`,
    GSI1SK: now,
    recordId,
    recordType,
    clientId: input.clientId,
    practiceId: actor.practiceId,
    status: input.status || "draft",
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.sub,
    createdByName: actor.name,
  };

  await dynamo.send(
    new PutCommand({
      TableName: rlthAwsFoundation.clinicalRecordsTableName,
      Item: item,
      // Guard against duplicate creates (e.g. double-submit).
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })
  );

  return item;
}

// ---------------------------------------------------------------------------
// Audit Events (append-only — never updated)
// ---------------------------------------------------------------------------

export async function appendAuditEvent(
  actor: EhrActor,
  details: {
    action: string;
    category: string;
    clientId?: string;
    entityType?: string;
    entityId?: string;
    summary?: string;
  }
) {
  const dynamo = getDynamoDocumentClient();
  const timestamp = nowIso();
  const auditId = makeId("audit");
  const item = {
    PK: `PRACTICE#${actor.practiceId}`,
    SK: `AUDIT#${timestamp}#${auditId}`,
    GSI1PK: details.clientId ? `CLIENT#${details.clientId}` : `ACTOR#${actor.sub}`,
    GSI1SK: timestamp,
    auditId,
    practiceId: actor.practiceId,
    timestamp,
    actorId: actor.sub,
    actorName: actor.name,
    actorRole: actor.role,
    category: details.category,
    action: details.action,
    clientId: details.clientId || "",
    entityType: details.entityType || "",
    entityId: details.entityId || "",
    summary: details.summary || "",
  };

  await dynamo.send(
    new PutCommand({
      TableName: rlthAwsFoundation.auditEventsTableName,
      Item: item,
      // Audit events are append-only — each SK is globally unique (timestamp + random),
      // so this condition should never be violated in normal operation.
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })
  );

  return item;
}

export async function listAuditEvents(practiceId: string, limit = 50) {
  const dynamo = getDynamoDocumentClient();
  const response = await dynamo.send(
    new QueryCommand({
      TableName: rlthAwsFoundation.auditEventsTableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :auditPrefix)",
      ExpressionAttributeValues: {
        ":pk": `PRACTICE#${practiceId}`,
        ":auditPrefix": "AUDIT#",
      },
      ScanIndexForward: false,
      Limit: Math.min(Math.max(limit, 1), 100),
    })
  );

  return response.Items || [];
}

// ---------------------------------------------------------------------------
// Document Metadata
// ---------------------------------------------------------------------------

export type DocumentMetadataInput = Omit<
  DocumentMetadata,
  "createdAt"
>;

/**
 * Write a document metadata record to DynamoDB.
 * Called immediately after generating a presigned S3 upload URL so that
 * the document is tracked, listable, and access-controlled from the moment
 * the upload link is issued.
 */
export async function putDocumentMetadata(
  actor: EhrActor,
  input: DocumentMetadataInput
) {
  const dynamo = getDynamoDocumentClient();
  const createdAt = nowIso();

  const item = {
    PK: `CLIENT#${input.clientId}`,
    SK: `DOCUMENT#${createdAt}#${input.documentId}`,
    GSI1PK: `PRACTICE#${input.practiceId}#DOCS`,
    GSI1SK: createdAt,
    documentId: input.documentId,
    practiceId: input.practiceId,
    clientId: input.clientId,
    uploadedBy: input.uploadedBy,
    title: input.title,
    documentType: input.documentType,
    storageKey: input.storageKey,
    accessLevel: input.accessLevel,
    createdAt,
    uploadedByName: actor.name,
    uploadedByRole: actor.role,
  };

  await dynamo.send(
    new PutCommand({
      TableName: rlthAwsFoundation.documentMetadataTableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })
  );

  return item;
}

export async function listDocumentMetadata(clientId: string, limit = 50) {
  const dynamo = getDynamoDocumentClient();
  const response = await dynamo.send(
    new QueryCommand({
      TableName: rlthAwsFoundation.documentMetadataTableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :docPrefix)",
      ExpressionAttributeValues: {
        ":pk": `CLIENT#${clientId}`,
        ":docPrefix": "DOCUMENT#",
      },
      ScanIndexForward: false,
      Limit: Math.min(Math.max(limit, 1), 100),
    })
  );

  return response.Items || [];
}

// ---------------------------------------------------------------------------
// Clinical Record — single-item fetch
// ---------------------------------------------------------------------------

/**
 * Fetch a single clinical record by practiceId, clientId, recordType, and recordId.
 * Returns null when the item does not exist.
 */
export async function getClinicalRecord(
  practiceId: string,
  clientId: string,
  recordType: string,
  recordId: string
): Promise<{ payload: Record<string, unknown>; [key: string]: unknown } | null> {
  const dynamo = getDynamoDocumentClient();
  const result = await dynamo.send(
    new GetCommand({
      TableName: rlthAwsFoundation.clinicalRecordsTableName,
      Key: {
        PK: `CLIENT#${clientId}`,
        SK: `RECORD#${recordType}#${recordId}`,
      },
    })
  );
  if (!result.Item) return null;
  return result.Item as { payload: Record<string, unknown>; [key: string]: unknown };
}

// ---------------------------------------------------------------------------
// AI Scribe Jobs
// ---------------------------------------------------------------------------

/**
 * Look up a saved HealthScribe job record by practiceId, clientId, and jobName.
 * Used to verify chart ownership before polling AWS for job status.
 * Returns null when no matching record exists.
 */
export async function getSavedScribeJob(
  practiceId: string,
  clientId: string,
  jobName: string
): Promise<{ payload: Record<string, unknown>; [key: string]: unknown } | null> {
  return getClinicalRecord(practiceId, clientId, "healthscribe-job", jobName);
}

// ---------------------------------------------------------------------------
// Client Profiles
// ---------------------------------------------------------------------------

export type ClientProfileRecord = {
  clientId: string;
  practiceId: string;
  fullName: string;
  cognitoUserId?: string;
  assignedProviderIds: string[];
  status: "active" | "inactive" | "archived";
  [key: string]: unknown;
};

/**
 * Fetch a single client profile by practiceId and clientId.
 * Returns null when the profile does not exist.
 * Used by requireClientAccess() and the clients API route.
 */
export async function getClientProfile(
  practiceId: string,
  clientId: string
): Promise<ClientProfileRecord | null> {
  const dynamo = getDynamoDocumentClient();
  const result = await dynamo.send(
    new GetCommand({
      TableName: rlthAwsFoundation.clinicalRecordsTableName,
      Key: {
        PK: `PRACTICE#${practiceId}#CLIENT#${clientId}`,
        SK: "PROFILE",
      },
    })
  );
  if (!result.Item) return null;
  return result.Item as ClientProfileRecord;
}

/**
 * List client profiles the actor is authorized to see.
 *
 * Profiles are stored one item per client at
 *   PK = PRACTICE#{practiceId}#CLIENT#{clientId}, SK = "PROFILE"
 * and indexed on GSI1 with
 *   GSI1PK = PRACTICE#{practiceId}#CLIENTS
 * so the whole practice roster can be read with a single GSI query.
 *
 * Role scoping:
 * - owner / auditor → all non-archived profiles for the practice
 * - provider / clinical_staff / billing_staff → only profiles where actor.sub
 *   is in assignedProviderIds
 * - client → only their own profile (matched by cognitoUserId)
 */
export async function listClientProfiles(actor: EhrActor): Promise<ClientProfileRecord[]> {
  const dynamo = getDynamoDocumentClient();
  const response = await dynamo.send(
    new QueryCommand({
      TableName: rlthAwsFoundation.clinicalRecordsTableName,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :gsi1pk",
      ExpressionAttributeValues: {
        ":gsi1pk": `PRACTICE#${actor.practiceId}#CLIENTS`,
      },
      ScanIndexForward: false,
      Limit: 500,
    })
  );

  const all = ((response.Items || []) as ClientProfileRecord[]).filter(
    (profile) => profile.status !== "archived"
  );

  if (actor.role === "owner" || actor.role === "auditor") return all;

  if (actor.role === "client") {
    return all.filter((profile) => profile.cognitoUserId === actor.sub);
  }

  // provider / clinical_staff / billing_staff — only assigned charts
  return all.filter(
    (profile) =>
      Array.isArray(profile.assignedProviderIds) &&
      profile.assignedProviderIds.includes(actor.sub)
  );
}

/**
 * Create a client profile.
 *
 * Uses the same key schema the rest of the app reads/updates:
 *   PK = PRACTICE#{practiceId}#CLIENT#{clientId}, SK = "PROFILE"
 * plus GSI1PK = PRACTICE#{practiceId}#CLIENTS so listClientProfiles() can
 * read the whole roster in one query.
 *
 * If the caller does not provide a clientId, one is generated. The returned
 * object always includes clientId so the API route can follow up (e.g. to
 * write cognitoUserId) using the same key.
 */
export async function putClientProfile(
  actor: EhrActor,
  profile: Partial<ClientProfileRecord> & { fullName: string }
): Promise<ClientProfileRecord> {
  const dynamo = getDynamoDocumentClient();
  const now = nowIso();
  const clientId = profile.clientId || makeId("client");

  const item: ClientProfileRecord & Record<string, unknown> = {
    ...profile,
    clientId,
    practiceId: actor.practiceId,
    fullName: profile.fullName,
    assignedProviderIds: Array.isArray(profile.assignedProviderIds)
      ? profile.assignedProviderIds
      : [actor.sub],
    status: profile.status || "active",
    PK: `PRACTICE#${actor.practiceId}#CLIENT#${clientId}`,
    SK: "PROFILE",
    GSI1PK: `PRACTICE#${actor.practiceId}#CLIENTS`,
    GSI1SK: now,
    updatedAt: now,
    createdAt: profile.createdAt || now,
  };

  await dynamo.send(
    new PutCommand({
      TableName: rlthAwsFoundation.clinicalRecordsTableName,
      Item: item,
      // Prevent clobbering an existing chart with the same clientId.
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })
  );

  return item;
}
