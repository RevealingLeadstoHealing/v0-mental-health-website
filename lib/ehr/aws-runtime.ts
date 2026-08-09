import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { rlthAwsFoundation } from "../rlth-aws-foundation";

// Data resources (DynamoDB tables, documents bucket, KMS key) were provisioned in
// us-east-2. The Cognito pool was later recreated in us-east-1, so the two are no
// longer in the same region and cannot share one setting.
export const DEFAULT_AWS_REGION = "us-east-2";

// Deployment dashboards silently keep pasted whitespace, and an untrimmed region
// produces a hostname with a space in it, which makes `new URL()` throw at build time.
const AWS_REGION_PATTERN = /^[a-z]{2}(-gov)?-[a-z]+-\d$/;

export function sanitizeAwsRegion(value?: string | null) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return AWS_REGION_PATTERN.test(trimmed) ? trimmed : "";
}

// A Cognito user pool id is "<region>_<suffix>", so the pool id already states which
// region it lives in. Deriving the region from it means the two can never disagree,
// which is the failure that rejects every authenticated request: an issuer of
// https://cognito-idp.<wrong-region>.amazonaws.com/<poolId> addresses a pool that
// does not exist, so the JWKS lookup fails.
export function regionFromUserPoolId(userPoolId?: string | null) {
  const trimmed = typeof userPoolId === "string" ? userPoolId.trim() : "";
  return sanitizeAwsRegion(trimmed.split("_")[0]);
}

// Explicit configuration wins over AWS_REGION, which the serverless runtime injects
// with the region the function happens to run in, not the region the resources are in.
const region =
  sanitizeAwsRegion(process.env.EHR_AWS_REGION) ||
  sanitizeAwsRegion(process.env.NEXT_PUBLIC_AWS_REGION) ||
  sanitizeAwsRegion(rlthAwsFoundation.region) ||
  sanitizeAwsRegion(process.env.AWS_REGION) ||
  DEFAULT_AWS_REGION;

// Cognito calls and token verification must use the pool's own region, never the
// data region.
const cognitoRegion =
  sanitizeAwsRegion(process.env.EHR_COGNITO_REGION) ||
  regionFromUserPoolId(rlthAwsFoundation.cognitoUserPoolId) ||
  region;

let dynamoDocumentClient: DynamoDBDocumentClient | null = null;
let s3Client: S3Client | null = null;

export function getAwsRegion() {
  return region;
}

export function getCognitoRegion() {
  return cognitoRegion;
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
