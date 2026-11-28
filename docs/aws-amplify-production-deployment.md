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
2. For an Amplify-hosted public site, create an AWS Secrets Manager secret in
   the application's AWS region containing only the secret key as a plain
   string, not JSON. Give the Amplify **SSR compute role** (not just the build
   role) `secretsmanager:GetSecretValue` permission on that one secret, and
   `kms:Decrypt` on its key if a customer-managed KMS key is used.
3. In the public site's Amplify environment settings, set
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to the site key and
   `TURNSTILE_SECRET_ARN` to the secret's full ARN. The build forwards only
   these non-secret values to the server; never put the secret value in
   `amplify.yml`, `.env.production`, or a `NEXT_PUBLIC_` variable. Redeploy.
   If the public site is instead hosted on Vercel, set the site key and the
   server-only `TURNSTILE_SECRET_KEY` in that project's environment settings
   and redeploy; the AWS WAF instructions below do not protect Vercel.
   The patched image library requires Node.js 20.9 or newer in the build and
   server runtime.
4. Open the deployed contact page and confirm the widget appears and completes.
   Send a harmless test inquiry and confirm receipt; also verify an absent,
   failed, or expired CAPTCHA cannot send mail. `/api/contact` reports whether
   a secret identifier is configured, not whether it is readable or valid.
   Check server logs if verification fails, and confirm SES is allowed to send
   to the configured addresses. Do not put secret keys in logs or source code.

The existing in-process limit is only a best-effort backup: proxy headers can
be forged and server instances do not share counters. For an Amplify-hosted
public site, add a shared AWS WAF rate-based rule for POSTs to `/api/contact`.
`infra/aws/contact-waf.yaml` provides a separate global (CloudFront-scope) web
ACL with a 100-request, five-minute per-IP threshold. Deploy it in `us-east-1`
and associate it with the **public site's** Amplify app using Amplify's firewall
settings. If that app already has a web ACL, add the rule to the existing ACL
instead of replacing its protections. The WAF limit is approximate, may take
time to apply, costs extra, and affects all branches and domains on that app.
Confirm WAF sees individual visitor IPs: if a proxy sits in front of Amplify,
it may see shared proxy IPs and block legitimate visitors; configure trusted
proxy handling before enabling the rule. Monitor and adjust the threshold.
The template is not deployed or associated by committing it.

## PHI activation gate

Do not enter PHI until MFA, role and assignment denial tests, encrypted record writes, append-only audit writes, temporary-audio deletion, backup restore, incident-response documentation, workstation policies, and a documented risk analysis have all passed.
