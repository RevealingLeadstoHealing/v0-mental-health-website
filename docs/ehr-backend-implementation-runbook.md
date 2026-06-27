# RLTH EHR Backend Implementation Runbook

This is the next engineering sequence for moving the EHR from locked demo mode to production backend mode.

## Phase 1: AWS Account Readiness

1. Use a dedicated AWS account for RLTH EHR production.
2. Accept the AWS BAA in AWS Artifact before any PHI is stored, processed, transmitted, logged, or backed up.
3. Confirm the stack services are HIPAA eligible for PHI use under the accepted BAA.
4. Enable MFA for root/admin users.
5. Configure least-privilege deployment access.

## Phase 2: Foundation Stack

1. Deploy `infra/aws/rlth-ehr-foundation.yaml`.
2. Save CloudFormation outputs.
3. Add outputs to environment variables.
4. Keep `NEXT_PUBLIC_RLTH_EHR_DEMO_ENABLED=false` in production.

## Phase 3: Security Operations Stack

1. Deploy `infra/aws/rlth-ehr-security-operations.yaml` after the foundation stack.
2. Enable and review GuardDuty, Security Hub, AWS Config, Access Analyzer, Macie, and AWS Backup findings.
3. Confirm CloudWatch logs have retention and no PHI.
4. Keep WAF ready for association with the future API Gateway stage.

## Phase 4: API Boundary

Build API handlers behind `lib/ehr/backend-contract.ts`:

- `getBackendStatus`
- `getCurrentSession`
- `listClients`
- `getClient`
- `saveClient`
- `listClinicalNotes`
- `saveClinicalNote`
- `signClinicalNote`
- `listConsents`
- `saveConsent`
- `listDocuments`
- `listBillingRecords`
- `saveBillingRecord`
- `appendAuditEvent`

Each API request must verify Cognito JWT claims, `practiceId`, role, assigned client access, and MFA status before touching PHI.

## Phase 5: Data Layout

Use tenant-safe keys from the start:

- Practice: `PK=PRACTICE#{practiceId}`, `SK=PROFILE`
- Client: `PK=PRACTICE#{practiceId}`, `SK=CLIENT#{clientId}`
- Clinical note: `PK=CLIENT#{clientId}`, `SK=NOTE#{serviceDate}#{recordId}`
- Psychotherapy note: `PK=CLIENT#{clientId}`, `SK=PSYCHOTHERAPY_NOTE#{serviceDate}#{recordId}`
- Consent: `PK=CLIENT#{clientId}`, `SK=CONSENT#{consentType}#{version}`
- Billing snapshot: `PK=CLIENT#{clientId}`, `SK=BILLING#{serviceDate}#{billingId}`
- Audit event: `PK=PRACTICE#{practiceId}`, `SK=AUDIT#{occurredAt}#{eventId}`

Psychotherapy notes must remain separated from routine medical record notes.

## Phase 6: Production Unlock Criteria

The EHR can only move out of lock mode when all are true:

- Signed BAA is on file.
- Cognito auth works with MFA.
- Provider/client roles are enforced server-side.
- Assigned-provider chart access is enforced server-side.
- DynamoDB and S3 are encrypted and private.
- Audit writes occur for login, chart view, edits, signatures, exports, and access denial.
- Runtime logs do not contain PHI.
- Backup/PITR and restore procedure are documented.
- Production smoke tests pass.
- Legal/compliance review is complete.