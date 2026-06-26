# RLTH EHR Production Readiness

The public website may remain live. The EHR must remain locked for clinical PHI until the items below are completed.

## Current Protection

- `/login` and `/ehr` show a production lock by default.
- Demo mode only opens when `NEXT_PUBLIC_RLTH_EHR_DEMO_ENABLED=true` is set.
- Demo mode uses browser localStorage and is for non-PHI testing only.

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

Choose the production backend and auth provider, then replace the localStorage mock store with server-backed storage and enforced security rules.