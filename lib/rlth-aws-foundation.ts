const env = process.env;

function pick(...vals: Array<string | undefined>) {
  for (const v of vals) {
    if (v && v.trim()) return v.trim();
  }
  return "";
}

/**
 * Require an environment variable at runtime. Throws a clear error during
 * startup if a mandatory value is missing so misconfiguration is caught
 * immediately rather than silently falling through to a wrong resource.
 *
 * NOTE: All values that were previously hardcoded here have been removed.
 * Set the corresponding environment variables in your .env.local (local dev)
 * or in your Vercel project settings (production/staging). See .env.example.
 */
function require(envVar: string, fallback?: string): string {
  const value = pick(env[envVar], fallback);
  if (!value) {
    throw new Error(
      `[RLTH EHR] Required environment variable "${envVar}" is not set. ` +
        `Add it to .env.local for local development or to Vercel environment variables for production.`
    );
  }
  return value;
}

export const rlthAwsFoundation = {
  region: pick(env.EHR_AWS_REGION, env.AWS_REGION, env.NEXT_PUBLIC_AWS_REGION, "us-east-2"),

  // Cognito — set EHR_COGNITO_USER_POOL_ID and EHR_COGNITO_CLIENT_ID in your environment.
  get cognitoUserPoolId() {
    return require("EHR_COGNITO_USER_POOL_ID");
  },
  get cognitoUserPoolClientId() {
    return require("EHR_COGNITO_CLIENT_ID", pick(env.NEXT_PUBLIC_EHR_COGNITO_CLIENT_ID));
  },

  // DynamoDB table names — set EHR_RECORDS_TABLE, EHR_AUDIT_TABLE, EHR_DOCUMENTS_TABLE.
  get clinicalRecordsTableName() {
    return require(
      "EHR_RECORDS_TABLE",
      pick(env.RECORDS_TABLE_NAME, env.EHR_RECORDS_TABLE_NAME)
    );
  },
  get auditEventsTableName() {
    return require(
      "EHR_AUDIT_TABLE",
      pick(env.AUDIT_TABLE_NAME, env.AUDIT_EVENTS_TABLE_NAME)
    );
  },
  get documentMetadataTableName() {
    return require(
      "EHR_DOCUMENTS_TABLE",
      pick(env.DOCUMENT_METADATA_TABLE_NAME)
    );
  },

  // S3 bucket — set EHR_DOCUMENTS_BUCKET.
  get documentsBucketName() {
    return require("EHR_DOCUMENTS_BUCKET", pick(env.DOCUMENTS_BUCKET_NAME));
  },

  // KMS — set EHR_KMS_KEY_ARN.
  get kmsKeyArn() {
    return require("EHR_KMS_KEY_ARN");
  },

  // CloudTrail trail name (non-sensitive, safe as a default).
  cloudTrailName: pick(env.EHR_CLOUDTRAIL_NAME, "rlth-prod-ehr-management-events"),
} as const;

export function getRlthAwsFoundationStatus() {
  // Use try/catch so the status endpoint can report missing config
  // without crashing the entire health-check response.
  let cognitoConfigured = false;
  let storageConfigured = false;
  let auditConfigured = false;

  try {
    cognitoConfigured = Boolean(
      rlthAwsFoundation.cognitoUserPoolId && rlthAwsFoundation.cognitoUserPoolClientId
    );
  } catch {
    cognitoConfigured = false;
  }

  try {
    storageConfigured = Boolean(
      rlthAwsFoundation.clinicalRecordsTableName && rlthAwsFoundation.documentsBucketName
    );
  } catch {
    storageConfigured = false;
  }

  try {
    auditConfigured = Boolean(
      rlthAwsFoundation.auditEventsTableName && rlthAwsFoundation.cloudTrailName
    );
  } catch {
    auditConfigured = false;
  }

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
