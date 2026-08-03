const env = process.env;

function pick(...vals: Array<string | undefined>) {
  for (const v of vals) {
    if (v && v.trim()) return v.trim();
  }
  return "";
}

export const rlthAwsFoundation = {
  region: pick(env.EHR_AWS_REGION, env.AWS_REGION, "us-east-2"),
  cognitoUserPoolId: pick(env.EHR_COGNITO_USER_POOL_ID, "us-east-2_kSd3RAPsl"),
  cognitoUserPoolClientId: pick(
    env.EHR_COGNITO_CLIENT_ID,
    env.NEXT_PUBLIC_EHR_COGNITO_CLIENT_ID,
    "20r3lfn9rtsh6qr3k2q3slk82u"
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
  kmsKeyArn: pick(
    env.EHR_KMS_KEY_ARN,
    "arn:aws:kms:us-east-2:597936860711:key/9114a3e2-b165-4db2-a1db-7d3a217e647a"
  ),
} as const;

export function getRlthAwsFoundationStatus() {
  return {
    configured: true,
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
    backupAndMonitoringStack: "rlth-ehr-prod-security-operations",
    foundationStack: "rlth-ehr-prod-foundation",
  };
}
