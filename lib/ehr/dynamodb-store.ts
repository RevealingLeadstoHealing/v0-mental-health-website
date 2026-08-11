import { GetCommand, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { rlthAwsFoundation } from "../rlth-aws-foundation";
import { getDynamoDocumentClient } from "./aws-runtime";
import type { EhrActor } from "./auth";

export type ClinicalRecordInput = {
  clientId: string;
  recordType: string;
  recordId?: string;
  payload: Record<string, unknown>;
  status?: string;
};

export type ClientProfileInput = {
  clientId?: string;
  fullName: string;
  preferredName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  status?: "active" | "inactive" | "archived";
  assignedProviderIds?: string[];
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function clientPartition(practiceId: string, clientId: string) {
  return `PRACTICE#${practiceId}#CLIENT#${clientId}`;
}

export async function listClinicalRecords(practiceId: string, clientId: string, limit = 50) {
  const dynamo = getDynamoDocumentClient();
  const response = await dynamo.send(
    new QueryCommand({
      TableName: rlthAwsFoundation.clinicalRecordsTableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :recordPrefix)",
      ExpressionAttributeValues: {
        ":pk": clientPartition(practiceId, clientId),
        ":recordPrefix": "RECORD#",
      },
      ScanIndexForward: false,
      Limit: Math.min(Math.max(limit, 1), 100),
    })
  );

  return response.Items || [];
}

export async function putClinicalRecord(actor: EhrActor, input: ClinicalRecordInput) {
  const dynamo = getDynamoDocumentClient();
  const createdAt = nowIso();
  const recordId = input.recordId || makeId("record");
  const recordType = input.recordType || "clinical-note";

  const item = {
    PK: clientPartition(actor.practiceId, input.clientId),
    SK: `RECORD#${recordType}#${recordId}`,
    GSI1PK: `PRACTICE#${actor.practiceId}#TYPE#${recordType}`,
    GSI1SK: createdAt,
    recordId,
    recordType,
    clientId: input.clientId,
    practiceId: actor.practiceId,
    status: input.status || "draft",
    payload: input.payload,
    createdAt,
    updatedAt: createdAt,
    createdBy: actor.sub,
    createdByName: actor.name,
  };

  await dynamo.send(
    new PutCommand({
      TableName: rlthAwsFoundation.clinicalRecordsTableName,
      Item: item,
      ...(input.recordId ? {} : { ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)" }),
    })
  );

  return item;
}

export async function getClientProfile(practiceId: string, clientId: string) {
  const dynamo = getDynamoDocumentClient();
  const response = await dynamo.send(new GetCommand({
    TableName: rlthAwsFoundation.clinicalRecordsTableName,
    Key: {
      PK: clientPartition(practiceId, clientId),
      SK: "PROFILE",
    },
    ConsistentRead: true,
  }));
  return response.Item || null;
}

export async function listClientProfiles(actor: EhrActor, limit = 100) {
  const dynamo = getDynamoDocumentClient();
  const response = await dynamo.send(new QueryCommand({
    TableName: rlthAwsFoundation.clinicalRecordsTableName,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)",
    ExpressionAttributeValues: {
      ":pk": `PRACTICE#${actor.practiceId}#TYPE#client-profile`,
      ":prefix": "CLIENT#",
    },
    ScanIndexForward: true,
    Limit: Math.min(Math.max(limit, 1), 100),
  }));
  const items = response.Items || [];
  if (actor.role === "owner" || actor.role === "auditor") return items;
  if (actor.role === "client") return items.filter((item) => item.cognitoUserId === actor.sub);
  return items.filter((item) => Array.isArray(item.assignedProviderIds) && item.assignedProviderIds.includes(actor.sub));
}

export async function putClientProfile(actor: EhrActor, input: ClientProfileInput) {
  const dynamo = getDynamoDocumentClient();
  const timestamp = nowIso();
  const clientId = input.clientId || makeId("client");
  const item = {
    PK: clientPartition(actor.practiceId, clientId),
    SK: "PROFILE",
    GSI1PK: `PRACTICE#${actor.practiceId}#TYPE#client-profile`,
    GSI1SK: `CLIENT#${clientId}`,
    recordType: "client-profile",
    practiceId: actor.practiceId,
    clientId,
    fullName: input.fullName,
    preferredName: input.preferredName || "",
    dateOfBirth: input.dateOfBirth || "",
    email: input.email || "",
    phone: input.phone || "",
    status: input.status || "active",
    assignedProviderIds: input.assignedProviderIds?.length ? input.assignedProviderIds : [actor.sub],
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: actor.sub,
  };
  await dynamo.send(new PutCommand({
    TableName: rlthAwsFoundation.clinicalRecordsTableName,
    Item: item,
    ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
  }));
  return item;
}

export async function appendAuditEvent(actor: EhrActor, details: {
  action: string;
  category: string;
  clientId?: string;
  entityType?: string;
  entityId?: string;
  summary?: string;
}) {
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
