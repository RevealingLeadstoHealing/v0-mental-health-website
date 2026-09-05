import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createVoicemailHandler } from './voicemail-flow.mjs';

const table = process.env.EHR_RECORDS_TABLE;
if (!table || !process.env.EHR_AWS_REGION) throw new Error('Voicemail chart storage is not configured');
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.EHR_AWS_REGION }));
export const handler = createVoicemailHandler({
  accountId: process.env.EHR_PHONE_ACCOUNT_ID,
  region: process.env.EHR_PHONE_REGION,
  applicationId: process.env.EHR_PHONE_APPLICATION_ID,
  practiceId: process.env.EHR_PHONE_PRACTICE_ID,
  providerId: process.env.EHR_PHONE_PROVIDER_ID,
  number: process.env.EHR_PHONE_NUMBER,
  bucket: process.env.EHR_VOICEMAIL_BUCKET,
}, {
  async get(Key) {
    return (await db.send(new GetCommand({ TableName: table, Key, ConsistentRead: true }))).Item;
  },
  async save(Item, previousSequence) {
    await db.send(new PutCommand({ TableName: table, Item,
      ConditionExpression: previousSequence === undefined ? 'attribute_not_exists(PK)' : 'lastSequence = :previous',
      ...(previousSequence === undefined ? {} : { ExpressionAttributeValues: { ':previous': previousSequence } }),
    }));
  },
});
