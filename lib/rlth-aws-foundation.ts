export const rlthAwsFoundation = {
  region: "us-east-2",
  cognitoUserPoolId: "us-east-2_kSd3RAPsl",
  cognitoUserPoolClientId: "64q7036m6i0sl68t9an6dqksnn",
  clinicalRecordsTableName: "rlth-prod-clinical-records",
  auditEventsTableName: "rlth-prod-audit-events",
  documentMetadataTableName: "rlth-prod-document-metadata",
  documentsBucketName: "rlth-prod-ehr-documents-597936860711",
  cloudTrailName: "rlth-prod-ehr-management-events",
  kmsKeyArn: "arn:aws:kms:us-east-2:597936860711:key/9114a3e2-b165-4db2-a1db-7d3a217e647a",
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
