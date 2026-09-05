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

## SES Email Setup (required before real provider accounts)

Cognito sends password reset and invitation emails. Without a verified SES identity the
User Pool falls back to Cognito's shared email sender, which is limited to **50 emails/day**
and is not suitable for production use.

Steps to configure SES:

1. **Verify your sending domain** in the AWS SES console:
   - Go to SES → Verified identities → Create identity → Domain
   - Enter `revealing-leads-to-healing-wellness-services.org`
   - Add the DKIM and SPF DNS records that SES provides to your DNS registrar
   - Wait for verification status to show "Verified"

2. **Request production access** (exit SES sandbox):
   - Go to SES → Account dashboard → Request production access
   - Provide your use case (transactional clinical system, provider/staff only, no marketing)
   - AWS typically approves within 24 hours

3. **Copy the identity ARN** from the verified identity details page:
   - Format: `arn:aws:ses:us-east-2:<account-id>:identity/<domain>`

4. **Re-deploy the foundation stack** with the SES parameters:
   ```powershell
   aws cloudformation deploy `
     --stack-name rlth-ehr-prod-foundation `
     --template-file infra/aws/rlth-ehr-foundation.yaml `
     --capabilities CAPABILITY_NAMED_IAM `
     --parameter-overrides `
       PracticeSlug=rlth `
       EnvironmentName=prod `
       SesFromAddress="no-reply@revealing-leads-to-healing-wellness-services.org" `
       SesIdentityArn="arn:aws:ses:us-east-2:<account-id>:identity/revealing-leads-to-healing-wellness-services.org"
   ```

5. **Re-deploy the Vercel IAM stack** with matching SES parameters so the runtime user gets send permission:
   ```powershell
   aws cloudformation deploy `
     --stack-name rlth-ehr-prod-vercel-iam `
     --template-file infra/aws/rlth-ehr-vercel-runtime-iam.yaml `
     --capabilities CAPABILITY_NAMED_IAM `
     --parameter-overrides `
       ... `
       SesFromAddress="no-reply@revealing-leads-to-healing-wellness-services.org" `
       SesIdentityArn="arn:aws:ses:us-east-2:<account-id>:identity/revealing-leads-to-healing-wellness-services.org"
   ```

6. **Set environment variables** in Vercel:
   - `EHR_SES_FROM_ADDRESS=no-reply@revealing-leads-to-healing-wellness-services.org`
   - `EHR_SES_IDENTITY_ARN=arn:aws:ses:us-east-2:<account-id>:identity/...`

## Production Notes

- CloudWatch runtime logs must never include PHI.
- WAF is created here, but it must be associated with the future API Gateway stage after the API exists.
- AWS Backup selection uses the `Application=RLTH-EHR` tag. Keep that tag on all PHI-supporting resources that require backup coverage.
- Macie can identify sensitive data in S3, but it does not replace authorization checks or private bucket policies.