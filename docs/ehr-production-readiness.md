# RLTH EHR Production Readiness

The public website may remain live. The EHR must remain locked for clinical PHI until the items below are completed.

## Current Protection

- `/login` and `/ehr` show a production lock by default.
- Demo mode only opens when `NEXT_PUBLIC_RLTH_EHR_DEMO_ENABLED=true` is set.
- Demo mode uses browser localStorage and is for non-PHI testing only.

## Product Direction

RLTH EHR is a standalone product owned by Revealing Leads to Healing. It is practice-first for current clinical use and shaped for a future leased/SaaS version.

The production backend direction is AWS under a signed BAA. Vercel can continue hosting the public marketing website while the clinical backend is built separately.

## Required Before Real Client Use

1. Signed BAA with every service that stores, processes, transmits, logs, or backs up PHI.
2. Production auth with MFA, password reset, session timeout, and role claims.
3. Provider, admin, staff, and client authorization rules.
4. BAA-supported database/storage for charts, documents, signatures, forms, billing data, and audit logs.
5. Strict database rules so clients only access their own portal data and providers only access assigned charts.
6. Append-only audit logs for login, chart view, note edits, signatures, exports, deletes, and record requests.
7. Backup, retention, incident response, device/access review, and breach procedures.
8. Legal/compliance review before storing PHI.

## Next Engineering Phase

Build the AWS-backed practice-first backend and replace the localStorage mock store with authenticated server-backed storage and enforced security rules.

Supporting files:

- `docs/rlth-ehr-standalone-architecture.md`
- `docs/aws-production-checklist.md`
- `lib/ehr/domain-model.ts`
- `lib/ehr/audit-model.ts`
- `lib/ehr/backend-contract.ts`