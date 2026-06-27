import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { rlthAwsFoundation } from "../rlth-aws-foundation";

const region = process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || rlthAwsFoundation.region;

let dynamoDocumentClient: DynamoDBDocumentClient | null = null;
let s3Client: S3Client | null = null;

export function getAwsRegion() {
  return region;
}

export function hasAwsRuntimeCredentials() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID ||
      process.env.AWS_ROLE_ARN ||
      process.env.AWS_WEB_IDENTITY_TOKEN_FILE ||
      process.env.VERCEL_OIDC_TOKEN
  );
}

export function getDynamoDocumentClient() {
  if (!dynamoDocumentClient) {
    dynamoDocumentClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }
  return dynamoDocumentClient;
}

export function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({ region });
  }
  return s3Client;
}

export function getRuntimeReadiness() {
  return {
    region,
    runtimeCredentialsConfigured: hasAwsRuntimeCredentials(),
    foundation: {
      clinicalRecordsTableName: rlthAwsFoundation.clinicalRecordsTableName,
      auditEventsTableName: rlthAwsFoundation.auditEventsTableName,
      documentMetadataTableName: rlthAwsFoundation.documentMetadataTableName,
      documentsBucketName: rlthAwsFoundation.documentsBucketName,
    },
  };
}
