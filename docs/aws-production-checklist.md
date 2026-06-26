# AWS Production Checklist For RLTH EHR

This checklist turns the current prototype into a practice-first production EHR.

## Account And Legal

- [ ] Create or select the AWS account dedicated to RLTH EHR.
- [ ] Execute AWS BAA in AWS Artifact before storing/processing PHI.
- [ ] Confirm selected AWS services are HIPAA eligible.
- [ ] Enable MFA on root and admin users.
- [ ] Create least-privilege IAM roles.
- [ ] Disable long-lived access keys where possible.

## Authentication

- [ ] Create Cognito user pool.
- [ ] Enforce MFA for providers/admins.
- [ ] Disable public provider self-registration.
- [ ] Configure client invite/onboarding workflow.
- [ ] Add session timeout and refresh policy.
- [ ] Add failed-login lockout policy.

## Data Storage

- [ ] Create encrypted database tables with `practiceId` on every PHI record.
- [ ] Enable PITR/backups.
- [ ] Add provider-client assignment table.
- [ ] Separate psychotherapy notes from routine medical records.
- [ ] Add consent versions and signature records.

## File Storage

- [ ] Create private S3 buckets for documents.
- [ ] Block all public access.
- [ ] Enable KMS encryption.
- [ ] Use short-lived signed URLs only after authorization checks.
- [ ] Enable object versioning where appropriate.

## Audit And Logging

- [ ] Create append-only app audit table.
- [ ] Log chart views, note edits, signatures, exports, deletes, login failures, and role changes.
- [ ] Remove all PHI from runtime logs.
- [ ] Enable CloudTrail.
- [ ] Configure CloudWatch retention.
- [ ] Define 6-year retention for administrative/compliance records unless legal counsel specifies otherwise.

## Application Cutover

- [ ] Replace localStorage store with authenticated API calls.
- [ ] Keep EHR lock active until the backend passes security checks.
- [ ] Add provider-only admin setup path.
- [ ] Add client invite flow.
- [ ] Add production smoke tests.
- [ ] Review with compliance/legal before first real client record.