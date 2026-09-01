import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createFaxIngestor } from './ingest.mjs';

if (!process.env.EHR_RECORDS_TABLE || !process.env.EHR_AWS_REGION) throw new Error('Fax database is not configured');
const s3 = new S3Client({ region: process.env.EHR_FAX_REGION });
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.EHR_AWS_REGION }));
export const handler = createFaxIngestor({
  bucket: process.env.EHR_FAX_BUCKET, region: process.env.EHR_FAX_REGION,
  practiceId: process.env.EHR_FAX_PRACTICE_ID, providerId: process.env.EHR_FAX_PROVIDER_ID,
  kmsKeyArn: process.env.EHR_FAX_KMS_KEY_ARN,
}, {
  head: source => s3.send(new HeadObjectCommand(source)),
  async signature(source) {
    const object = await s3.send(new GetObjectCommand({ ...source, Range: 'bytes=0-4' }));
    return await object.Body?.transformToString();
  },
  async insert(Item) {
    await db.send(new PutCommand({ TableName: process.env.EHR_RECORDS_TABLE, Item,
      ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)' }));
  },
});
