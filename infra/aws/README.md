# RLTH EHR AWS Foundation

This folder contains the first deployable AWS infrastructure scaffold for the standalone RLTH EHR.

Do not deploy this for PHI until the AWS account has an accepted AWS Business Associate Addendum (BAA) in AWS Artifact and the selected services are confirmed HIPAA eligible for the account.

## What The Stack Creates

- Cognito user pool with email login, MFA, admin-created users only, and role groups.
- KMS key with rotation enabled.
- DynamoDB tables for clinical records, document metadata, and audit events.
- DynamoDB point-in-time recovery and deletion protection.
- Private S3 document bucket with public access blocked, KMS encryption, and versioning.
- CloudTrail management-event trail with encrypted log bucket.

## Deploy Command

Run from the project root after AWS CLI is configured for the dedicated RLTH EHR AWS account:

```powershell
aws cloudformation deploy `
  --stack-name rlth-ehr-prod-foundation `
  --template-file infra/aws/rlth-ehr-foundation.yaml `
  --capabilities CAPABILITY_NAMED_IAM `
  --parameter-overrides PracticeSlug=rlth EnvironmentName=prod
```

## After Deployment

Capture the stack outputs and set the matching Vercel/AWS environment variables:

- `NEXT_PUBLIC_AWS_REGION`
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`
- `RLTH_EHR_DOCUMENT_BUCKET`
- `RLTH_EHR_KMS_KEY_ID`

The EHR lock should remain enabled until authentication, authorization checks, API handlers, audit writes, document signed URLs, backup policy, and production smoke tests are complete.

## Security Operations Stack

After the foundation stack is complete, deploy `rlth-ehr-security-operations.yaml` using the `KmsKeyArn` output from the foundation stack.

See `infra/aws/security-operations.md` for the deploy command and operational notes.