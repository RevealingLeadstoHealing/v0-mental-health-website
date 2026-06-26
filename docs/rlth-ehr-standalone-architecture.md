# RLTH EHR Standalone Product Architecture

## Product Decision

RLTH EHR stands on its own. It is not a wrapper around Tebra, SimplePractice, TherapyNotes, or another EHR product.

The public RLTH website can remain live while the production EHR is built. The clinical EHR remains locked until the production backend and compliance controls are complete.

## Practice-First Scope

Version 1 is for Revealing Leads to Healing Counseling & Wellness Services, LLC.

The system is still designed with `practiceId` on every protected record so a later leased/SaaS version can separate each practice without a rebuild.

## Production Infrastructure Direction

Recommended first production stack:

- AWS BAA through AWS Artifact before PHI is stored or processed.
- Cognito for provider/client authentication, MFA, password reset, session controls, and role claims.
- API Gateway + Lambda for server-side EHR workflows.
- DynamoDB or Aurora/RDS for structured client records.
- S3 private buckets for consents, uploads, signed forms, and document attachments.
- KMS for encryption keys.
- CloudTrail and CloudWatch for platform logs.
- App-level append-only audit table for clinical audit events.
- AWS Backup / PITR for disaster recovery.
- Optional future AI: AWS Transcribe Medical / HealthScribe only if covered under the signed BAA and configured to avoid uncontrolled retention.

## Core Data Boundaries

Every protected entity must include:

- `practiceId`
- actor/provider/client identifiers as applicable
- creation/update timestamps
- access level
- audit log coverage

Records must not depend on browser localStorage, public URLs, query strings, analytics events, or console logs.

## Version 1 Modules

1. Provider authentication and MFA.
2. Client profile and assigned-provider relationship.
3. Biopsychosocial assessment.
4. Initial progress note.
5. Follow-up progress note.
6. Treatment plan.
7. Consent and e-signature records.
8. Billing snapshot with ICD/CPT support.
9. Document metadata and private file storage.
10. Audit log viewer for provider/admin.

## Future Leasing/SaaS Requirements

Before leasing to other providers or practices:

- Customer BAA template and legal review.
- Practice-level tenant onboarding.
- Practice owner/admin role.
- Data isolation tests by `practiceId`.
- Billing/subscription system.
- Support access policy.
- Incident response and breach notification procedures.
- Export/offboarding process for customer data.