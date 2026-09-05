# RLTH EHR AWS-only production deployment

The public website remains on Vercel. This branch deploys the clinical application through AWS Amplify Hosting SSR compute so PHI does not pass through Vercel.

## Required AWS Console sequence

1. Confirm the AWS BAA is active in AWS Artifact.
2. Deploy `infra/aws/rlth-ehr-healthscribe.yaml` in `us-east-1`.
3. In AWS Amplify Hosting, create an app from the GitHub repository and select branch `aws-ehr-production`.
4. Attach the stack output `AmplifySsrComputeRoleArn` as the app's SSR Compute role.
5. Add the environment variables listed below using stack outputs. Do not store long-lived AWS access keys.
6. Deploy and test with synthetic client data.
7. Attach `ehr.revealing-leads-to-healing-wellness-services.org` only after the synthetic-data tests pass.

## Environment variables

These values are resource identifiers, not credentials. Never add AWS access keys, passwords, API tokens, or application secrets to `amplify.yml` or `.env.production`.

- `AWS_REGION=us-east-2`
- `EHR_AWS_REGION=us-east-2`
- `EHR_COGNITO_USER_POOL_ID=us-east-2_kSd3RAPsl`
- `EHR_COGNITO_CLIENT_ID=64q7036m6i0sl68t9an6dqksnn`
- `EHR_RECORDS_TABLE=rlth-prod-clinical-records`
- `EHR_AUDIT_TABLE=rlth-prod-audit-events`
- `EHR_DOCUMENTS_TABLE=rlth-prod-document-metadata`
- `EHR_DOCUMENTS_BUCKET=rlth-prod-ehr-documents-597936860711`
- `EHR_KMS_KEY_ARN=arn:aws:kms:us-east-2:597936860711:key/9114a3e2-b165-4db2-a1db-7d3a217e647a`
- `EHR_HEALTHSCRIBE_REGION=us-east-1`
- `EHR_HEALTHSCRIBE_BUCKET=<HealthScribeBucketName output>`
- `EHR_HEALTHSCRIBE_KMS_KEY_ARN=<HealthScribeKmsKeyArn output>`
- `EHR_HEALTHSCRIBE_DATA_ROLE_ARN=<HealthScribeDataRoleArn output>`

## PHI activation gate

Do not enter PHI until MFA, role and assignment denial tests, encrypted record writes, append-only audit writes, temporary-audio deletion, backup restore, incident-response documentation, workstation policies, and a documented risk analysis have all passed.
