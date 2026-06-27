# RLTH EHR Security Operations Stack

Deploy this after `rlth-ehr-foundation.yaml` succeeds and after the AWS BAA is accepted.

## What This Stack Adds

- CloudWatch log groups for API/auth/document runtime logging with KMS encryption and retention.
- AWS Backup vault, plan, IAM role, and tag-based backup selection.
- GuardDuty threat detection.
- Security Hub security findings dashboard.
- IAM Access Analyzer for public/cross-account access findings.
- Macie session for S3 sensitive-data monitoring.
- Secrets Manager runtime secret placeholder.
- Regional WAF WebACL for the future API Gateway stage.
- AWS Config recorder, delivery bucket, and managed rules for S3 public access, DynamoDB PITR, and root MFA.

## Deploy Command

Replace `KmsKeyArn` with the `KmsKeyArn` output from the foundation stack.

```powershell
aws cloudformation deploy `
  --stack-name rlth-ehr-prod-security-operations `
  --template-file infra/aws/rlth-ehr-security-operations.yaml `
  --capabilities CAPABILITY_NAMED_IAM `
  --parameter-overrides PracticeSlug=rlth EnvironmentName=prod KmsKeyArn="FOUNDATION_KMS_KEY_ARN"
```

## Production Notes

- CloudWatch runtime logs must never include PHI.
- WAF is created here, but it must be associated with the future API Gateway stage after the API exists.
- AWS Backup selection uses the `Application=RLTH-EHR` tag. Keep that tag on all PHI-supporting resources that require backup coverage.
- Macie can identify sensitive data in S3, but it does not replace authorization checks or private bucket policies.