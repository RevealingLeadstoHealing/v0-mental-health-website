const env = process.env;

// Values are trimmed on the way in: deployment dashboards keep pasted whitespace,
// and these feed hostnames and ARNs where a stray space breaks the request.
function pick(...values: Array<string | undefined>) {
  for (const value of values) {
    if (value?.trim()) return value.trim();
  }
  return "";
}

// Each setting falls back to the provisioned production resource so the app still
// boots when a deployment is missing configuration. That fallback is convenient but
// it used to make the status endpoints indistinguishable from a correctly configured
// deployment, so we now record whether each value came from the environment or from
// the built-in default and report that truthfully below.
//
// AWS_REGION is deliberately not treated as explicit configuration: the serverless
// runtime injects it with the region the function happens to run in, which is not
// necessarily the region the Cognito pool lives in.
function resolve(envValues: Array<string | undefined>, fallback: string) {
  const provided = pick(...envValues);
  return { value: provided || fallback, fromEnvironment: Boolean(provided) };
}

const resolved = {
  region: resolve([env.EHR_AWS_REGION], pick(env.AWS_REGION, "us-east-2")),
  cognitoUserPoolId: resolve([env.EHR_COGNITO_USER_POOL_ID], "us-east-2_kSd3RAPsl"),
  cognitoUserPoolClientId: resolve(
    [env.EHR_COGNITO_CLIENT_ID, env.NEXT_PUBLIC_EHR_COGNITO_CLIENT_ID],
    "64q7036m6i0sl68t9an6dqksnn"
  ),
  clinicalRecordsTableName: resolve(
    [env.EHR_RECORDS_TABLE, env.RECORDS_TABLE_NAME, env.EHR_RECORDS_TABLE_NAME],
    "rlth-prod-clinical-records"
  ),
  auditEventsTableName: resolve(
    [env.EHR_AUDIT_TABLE, env.AUDIT_TABLE_NAME, env.AUDIT_EVENTS_TABLE_NAME],
    "rlth-prod-audit-events"
  ),
  documentMetadataTableName: resolve(
    [env.EHR_DOCUMENTS_TABLE, env.DOCUMENT_METADATA_TABLE_NAME],
    "rlth-prod-document-metadata"
  ),
  documentsBucketName: resolve(
    [env.EHR_DOCUMENTS_BUCKET, env.DOCUMENTS_BUCKET_NAME],
    "rlth-prod-ehr-documents-597936860711"
  ),
  cloudTrailName: resolve([env.EHR_CLOUDTRAIL_NAME], "rlth-prod-ehr-management-events"),
  kmsKeyArn: resolve(
    [env.EHR_KMS_KEY_ARN],
    "arn:aws:kms:us-east-2:597936860711:key/9114a3e2-b165-4db2-a1db-7d3a217e647a"
  ),
} as const;

export const rlthAwsFoundation = {
  region: resolved.region.value,
  cognitoUserPoolId: resolved.cognitoUserPoolId.value,
  cognitoUserPoolClientId: resolved.cognitoUserPoolClientId.value,
  clinicalRecordsTableName: resolved.clinicalRecordsTableName.value,
  auditEventsTableName: resolved.auditEventsTableName.value,
  documentMetadataTableName: resolved.documentMetadataTableName.value,
  documentsBucketName: resolved.documentsBucketName.value,
  cloudTrailName: resolved.cloudTrailName.value,
  kmsKeyArn: resolved.kmsKeyArn.value,
} as const;

// Settings still running on a built-in default rather than deployment configuration.
export function getSettingsUsingBuiltInDefaults() {
  return Object.entries(resolved)
    .filter(([, entry]) => !entry.fromEnvironment)
    .map(([key]) => key);
}

// Reports what this deployment was actually given. Previously every flag here was a
// truthiness check against a value that always fell back to a hard-coded constant, so
// `configured: true` was returned even with no environment configuration at all, and
// the endpoint could not be used to diagnose a misconfigured deployment.
export function getRlthAwsFoundationStatus() {
  const usingBuiltInDefaults = getSettingsUsingBuiltInDefaults();
  const cognitoConfigured =
    resolved.cognitoUserPoolId.fromEnvironment && resolved.cognitoUserPoolClientId.fromEnvironment;
  const storageConfigured =
    resolved.clinicalRecordsTableName.fromEnvironment && resolved.documentsBucketName.fromEnvironment;
  const auditConfigured =
    resolved.auditEventsTableName.fromEnvironment && resolved.cloudTrailName.fromEnvironment;

  return {
    configured: usingBuiltInDefaults.length === 0,
    region: rlthAwsFoundation.region,
    regionExplicitlyConfigured: resolved.region.fromEnvironment,
    cognitoConfigured,
    storageConfigured,
    auditConfigured,
    usingBuiltInDefaults,
    backupAndMonitoringStack: "rlth-ehr-prod-security-operations",
    foundationStack: "rlth-ehr-prod-foundation",
  };
}
