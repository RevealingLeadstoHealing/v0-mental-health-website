import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { rlthAwsFoundation } from "../rlth-aws-foundation";

export const DEFAULT_AWS_REGION = "us-east-1";

// Deployment dashboards silently keep pasted whitespace, and an untrimmed region
// produces a hostname with a space in it, which makes `new URL()` throw at build time.
const AWS_REGION_PATTERN = /^[a-z]{2}(-gov)?-[a-z]+-\d$/;

export function sanitizeAwsRegion(value?: string | null) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return AWS_REGION_PATTERN.test(trimmed) ? trimmed : "";
}

// Explicit configuration wins over AWS_REGION, which the serverless runtime injects
// with the region the function happens to run in, not the region the Cognito pool is in.
const region =
  sanitizeAwsRegion(process.env.EHR_AWS_REGION) ||
  sanitizeAwsRegion(process.env.NEXT_PUBLIC_AWS_REGION) ||
  sanitizeAwsRegion(rlthAwsFoundation.region) ||
  sanitizeAwsRegion(process.env.AWS_REGION) ||
  DEFAULT_AWS_REGION;

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
