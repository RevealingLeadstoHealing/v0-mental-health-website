import { createHash } from 'node:crypto';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDocumentClient } from './aws-runtime';
import { rlthAwsFoundation } from '../rlth-aws-foundation';
import { signedDocumentCopy } from './signed-document-copy';

export async function preserveSignedDocuments(practiceId: string, clientId: string, documents: unknown) {
  if (!Array.isArray(documents)) return;
  for (const document of documents) {
    const copy = signedDocumentCopy(document);
    if (!copy) continue;
    const id = createHash('sha256').update(JSON.stringify({ documentId: copy.documentId, signature: copy.signature })).digest('hex');
    try {
      await getDynamoDocumentClient().send(new PutCommand({
        TableName: rlthAwsFoundation.clinicalRecordsTableName,
        Item: { PK: `PRACTICE#${practiceId}#CLIENT#${clientId}`, SK: `SIGNED_DOCUMENT#${id}`, id, ...copy },
        ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      }));
    } catch (error: any) {
      if (error.name !== 'ConditionalCheckFailedException') throw error;
    }
  }
}

export async function listSignedDocuments(practiceId: string, clientId: string) {
  const documents: any[] = [];
  let cursor: any;
  do {
    const result = await getDynamoDocumentClient().send(new QueryCommand({
      TableName: rlthAwsFoundation.clinicalRecordsTableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': `PRACTICE#${practiceId}#CLIENT#${clientId}`, ':prefix': 'SIGNED_DOCUMENT#' },
      ConsistentRead: true, ExclusiveStartKey: cursor,
    }));
    documents.push(...(result.Items || []).map(({ PK, SK, ...copy }) => copy));
    cursor = result.LastEvaluatedKey;
  } while (cursor);
  return documents.sort((a, b) => String(b.signature.signedAt).localeCompare(String(a.signature.signedAt)));
}
