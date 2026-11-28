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

## Public contact form security

The public site's actual hosting must be confirmed before applying these steps:
this document describes a separate EHR deployment and does not prove where the
public website is currently hosted. Do not deploy the change until Turnstile is
configured; the contact form intentionally rejects submissions when its secret
or a valid CAPTCHA response is missing.

1. In Cloudflare Turnstile, create a widget for every real public website
   hostname, including both the `www` and non-`www` names if both are used.
   Copy the **site key** and **secret key** from that same widget. Do not use
   Cloudflare's test keys for production.
2. In the public site's AWS Amplify environment settings, set
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to the Cloudflare site key and
   `TURNSTILE_SECRET_KEY` to the Cloudflare secret key. The site key is public;
   the secret key is server-only and must never use a `NEXT_PUBLIC_` name.
   Redeploy after verifying both names and values.
   If the public site is instead hosted on Vercel, set the same two variable
   names in that project's environment settings and redeploy.
   The patched image library requires Node.js 20.9 or newer in the build and
   server runtime.
4. Open the deployed contact page and confirm the widget appears and completes.
   Send a harmless test inquiry and confirm receipt; also verify an absent,
   failed, or expired CAPTCHA cannot send mail. `/api/contact` reports whether
   a secret identifier is configured, not whether it is readable or valid.
   Check server logs if verification fails, and confirm SES is allowed to send
   to the configured addresses. Do not put secret keys in logs or source code.

AWS WAF setup is not required for the Turnstile fix to work. The contact route
also retains its built-in per-IP submission limit and hidden honeypot. Those
server-instance checks are a backup and do not require AWS Secrets Manager or
WAF configuration.

## PHI activation gate

Do not enter PHI until MFA, role and assignment denial tests, encrypted record writes, append-only audit writes, temporary-audio deletion, backup restore, incident-response documentation, workstation policies, and a documented risk analysis have all passed.
