import { QueryCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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
