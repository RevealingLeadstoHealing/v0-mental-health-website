const env = process.env;

function pick(...vals: Array<string | undefined>) {
  for (const v of vals) {
    if (v && v.trim()) return v.trim();
  }
  return "";
}

/**
 * Resolve a required environment variable.
 *
 * IMPORTANT: this must NOT be named `require` — that shadows the CommonJS
 * global and breaks Next.js/webpack bundling of every module that imports
 * this file.
 *
 * We do NOT throw here. During `next build`, Next.js evaluates route modules
 * to collect metadata, and a throw at module scope would fail the entire
 * build when an env var is absent from the build environment. Instead we
 * return an empty string; the runtime status/health endpoints already treat
 * empty values as "not configured", and the AWS SDK calls will surface a
 * clear error at request time if a value is genuinely missing in production.
 */
function resolveEnv(envVar: string, fallback?: string): string {
  return pick(env[envVar], fallback);
}

export const rlthAwsFoundation = {
  region: pick(env.EHR_AWS_REGION, env.AWS_REGION, env.NEXT_PUBLIC_AWS_REGION, "us-east-2"),

  // Cognito — set EHR_COGNITO_USER_POOL_ID and EHR_COGNITO_CLIENT_ID in your environment.
  get cognitoUserPoolId() {
    return resolveEnv("EHR_COGNITO_USER_POOL_ID");
  },
  get cognitoUserPoolClientId() {
    return resolveEnv("EHR_COGNITO_CLIENT_ID", pick(env.NEXT_PUBLIC_EHR_COGNITO_CLIENT_ID));
  },

  // DynamoDB table names — set EHR_RECORDS_TABLE, EHR_AUDIT_TABLE, EHR_DOCUMENTS_TABLE.
  get clinicalRecordsTableName() {
    return resolveEnv("EHR_RECORDS_TABLE", pick(env.RECORDS_TABLE_NAME, env.EHR_RECORDS_TABLE_NAME));
  },
  get auditEventsTableName() {
    return resolveEnv("EHR_AUDIT_TABLE", pick(env.AUDIT_TABLE_NAME, env.AUDIT_EVENTS_TABLE_NAME));
  },
  get documentMetadataTableName() {
    return resolveEnv("EHR_DOCUMENTS_TABLE", pick(env.DOCUMENT_METADATA_TABLE_NAME));
  },

  // S3 bucket — set EHR_DOCUMENTS_BUCKET.
  get documentsBucketName() {
    return resolveEnv("EHR_DOCUMENTS_BUCKET", pick(env.DOCUMENTS_BUCKET_NAME));
  },

  // KMS — set EHR_KMS_KEY_ARN.
  get kmsKeyArn() {
    return resolveEnv("EHR_KMS_KEY_ARN");
  },

  // CloudTrail trail name (non-sensitive, safe as a default).
  cloudTrailName: pick(env.EHR_CLOUDTRAIL_NAME, "rlth-prod-ehr-management-events"),
} as const;

export function getRlthAwsFoundationStatus() {
  const cognitoConfigured = Boolean(
    rlthAwsFoundation.cognitoUserPoolId && rlthAwsFoundation.cognitoUserPoolClientId
  );
  const storageConfigured = Boolean(
    rlthAwsFoundation.clinicalRecordsTableName && rlthAwsFoundation.documentsBucketName
  );
  const auditConfigured = Boolean(
    rlthAwsFoundation.auditEventsTableName && rlthAwsFoundation.cloudTrailName
  );

  return {
    configured: cognitoConfigured && storageConfigured && auditConfigured,
    region: rlthAwsFoundation.region,
    cognitoConfigured,
    storageConfigured,
    auditConfigured,
    backupAndMonitoringStack: "rlth-ehr-prod-security-operations",
    foundationStack: "rlth-ehr-prod-foundation",
  };
}
