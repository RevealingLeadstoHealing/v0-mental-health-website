import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { rlthAwsFoundation } from "../rlth-aws-foundation";
import { getDynamoDocumentClient } from "./aws-runtime";
import { ApiError } from "./auth";
import { normalizeEmail } from "./supervision";
import type { SupervisedNoteRecord, SuperviseeEntry } from "./supervision";

// Supervision data lives in the clinical records table under its own key space:
//   PK = PRACTICE#{practiceId}#SUPERVISION
//   SK = SUPERVISEE#{email}            registry entry for a supervisee
//   SK = NOTE#{clientId}#{noteId}      one record per supervised note

const TableName = () => rlthAwsFoundation.clinicalRecordsTableName;
const partitionKey = (practiceId: string) => `PRACTICE#${practiceId}#SUPERVISION`;
const MAX_NOTE_RECORDS = 500;

export async function getSupervisee(practiceId: string, email: string): Promise<SuperviseeEntry | null> {
  const dynamo = getDynamoDocumentClient();
  const result = await dynamo.send(
    new GetCommand({
      TableName: TableName(),
      Key: { PK: partitionKey(practiceId), SK: `SUPERVISEE#${normalizeEmail(email)}` },
    })
  );
  return (result.Item as SuperviseeEntry | undefined) || null;
}

export async function listSupervisees(practiceId: string): Promise<SuperviseeEntry[]> {
  const dynamo = getDynamoDocumentClient();
  const response = await dynamo.send(
    new QueryCommand({
      TableName: TableName(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": partitionKey(practiceId), ":prefix": "SUPERVISEE#" },
      Limit: 200,
    })
  );
  return (response.Items || []) as SuperviseeEntry[];
}

export async function putSupervisee(practiceId: string, entry: SuperviseeEntry): Promise<void> {
  const dynamo = getDynamoDocumentClient();
  await dynamo.send(
    new PutCommand({
      TableName: TableName(),
      Item: {
        PK: partitionKey(practiceId),
        SK: `SUPERVISEE#${normalizeEmail(entry.email)}`,
        recordType: "supervisee-registry",
        ...entry,
        email: normalizeEmail(entry.email),
      },
    })
  );
}

function noteSortKey(clientId: string, noteId: string) {
  return `NOTE#${clientId}#${noteId}`;
}

export async function getSupervisedNote(
  practiceId: string,
  clientId: string,
  noteId: string
): Promise<SupervisedNoteRecord | null> {
  const dynamo = getDynamoDocumentClient();
  const result = await dynamo.send(
    new GetCommand({
      TableName: TableName(),
      Key: { PK: partitionKey(practiceId), SK: noteSortKey(clientId, noteId) },
    })
  );
  return (result.Item as SupervisedNoteRecord | undefined) || null;
}

export async function listSupervisedNotes(
  practiceId: string,
  options: { clientId?: string } = {}
): Promise<SupervisedNoteRecord[]> {
  const dynamo = getDynamoDocumentClient();
  const prefix = options.clientId ? `NOTE#${options.clientId}#` : "NOTE#";
  const items: SupervisedNoteRecord[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const response = await dynamo.send(
      new QueryCommand({
        TableName: TableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": partitionKey(practiceId), ":prefix": prefix },
        ExclusiveStartKey: startKey,
      })
    );
    items.push(...((response.Items || []) as SupervisedNoteRecord[]));
    startKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (startKey && items.length < MAX_NOTE_RECORDS);
  return items.slice(0, MAX_NOTE_RECORDS);
}

/**
 * Writes a supervised note record. `expectedRevision` is the revision the caller read
 * (null when creating); the write fails with 409 if another request changed it first,
 * so a double-click can never apply a co-sign twice.
 */
export async function putSupervisedNote(
  practiceId: string,
  record: SupervisedNoteRecord,
  options: { expectedRevision: number | null }
): Promise<void> {
  const dynamo = getDynamoDocumentClient();
  const creating = options.expectedRevision === null;
  try {
    await dynamo.send(
      new PutCommand({
        TableName: TableName(),
        Item: {
          PK: partitionKey(practiceId),
          SK: noteSortKey(record.clientId, record.noteId),
          recordType: "supervised-note",
          ...record,
        },
        ConditionExpression: creating ? "attribute_not_exists(PK)" : "revision = :expected",
        ...(creating ? {} : { ExpressionAttributeValues: { ":expected": options.expectedRevision } }),
      })
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
      throw new ApiError(409, "This note was changed by someone else. Reload and try again.");
    }
    throw error;
  }
}
