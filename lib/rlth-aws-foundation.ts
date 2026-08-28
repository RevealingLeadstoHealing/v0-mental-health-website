const env = process.env;

function pick(...vals: Array<string | undefined>) {
  for (const v of vals) {
    if (v && v.trim()) return v.trim();
  }
  return "";
}

export const rlthAwsFoundation = {
  // Production EHR is anchored in Northern Virginia. Resource identifiers must
  // come from the deployed AWS environment so the app cannot silently fall
  // back to legacy Ohio authentication or encryption resources.
  region: pick(env.EHR_AWS_REGION, env.NEXT_PUBLIC_AWS_REGION, env.AWS_REGION, "us-east-1"),
  cognitoUserPoolId: pick(env.EHR_COGNITO_USER_POOL_ID, env.NEXT_PUBLIC_COGNITO_USER_POOL_ID),
  cognitoUserPoolClientId: pick(
    env.EHR_COGNITO_CLIENT_ID,
    env.NEXT_PUBLIC_EHR_COGNITO_CLIENT_ID,
    env.NEXT_PUBLIC_COGNITO_CLIENT_ID
  ),
  clinicalRecordsTableName: pick(
    env.EHR_RECORDS_TABLE,
    env.RECORDS_TABLE_NAME,
    env.EHR_RECORDS_TABLE_NAME,
    "rlth-prod-clinical-records"
  ),
  auditEventsTableName: pick(
    env.EHR_AUDIT_TABLE,
    env.AUDIT_TABLE_NAME,
    env.AUDIT_EVENTS_TABLE_NAME,
    "rlth-prod-audit-events"
  ),
  documentMetadataTableName: pick(
    env.EHR_DOCUMENTS_TABLE,
    env.DOCUMENT_METADATA_TABLE_NAME,
    "rlth-prod-document-metadata"
  ),
  documentsBucketName: pick(
    env.EHR_DOCUMENTS_BUCKET,
    env.DOCUMENTS_BUCKET_NAME,
    "rlth-prod-ehr-documents-597936860711"
  ),
  cloudTrailName: pick(env.EHR_CLOUDTRAIL_NAME, "rlth-prod-ehr-management-events"),
  kmsKeyArn: pick(env.EHR_KMS_KEY_ARN, env.RLTH_EHR_KMS_KEY_ID),
} as const;

export function getRlthAwsFoundationStatus() {
  return {
    configured: Boolean(
      rlthAwsFoundation.region &&
      rlthAwsFoundation.cognitoUserPoolId &&
      rlthAwsFoundation.cognitoUserPoolClientId
    ),
    region: rlthAwsFoundation.region,
    cognitoConfigured: Boolean(
      rlthAwsFoundation.cognitoUserPoolId && rlthAwsFoundation.cognitoUserPoolClientId
    ),
    storageConfigured: Boolean(
      rlthAwsFoundation.clinicalRecordsTableName && rlthAwsFoundation.documentsBucketName
    ),
    auditConfigured: Boolean(
      rlthAwsFoundation.auditEventsTableName && rlthAwsFoundation.cloudTrailName
    ),
    encryptionConfigured: Boolean(rlthAwsFoundation.kmsKeyArn),
    backupAndMonitoringStack: "rlth-ehr-prod-security-operations",
    foundationStack: "rlth-ehr-prod-foundation",
  };
}
