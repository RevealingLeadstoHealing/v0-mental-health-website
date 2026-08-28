# RLTH EHR Layout Verification Plan

Working branch: `work/ehr-layout-verification-20260828`
Production source: `aws-ehr-production`

## Locked scope

This work reorganizes the existing EHR presentation and navigation only. It does not rebuild or replace the clinical EHR, patient records, MRN logic, forms, billing, permissions, role separation, or clinical workflows.

## Existing provider clinical order to preserve

1. Patient Dashboard
2. Client Management
3. Client Chart
4. Scheduling
5. Patient Intake & Consents
6. Biopsychosocial Assessment
7. Treatment Plans
8. Follow-Up Notes
9. Assessments
10. Telehealth
11. Billing
12. Messages
13. Homework
14. Psychoeducation
15. Affirmations
16. Provider Trainings
17. Record Requests
18. Audit Log
19. Infrastructure

## Layout acceptance criteria

- Persistent provider navigation remains immediately visible.
- Selecting a module opens that module in the main workspace rather than requiring the user to hunt down the page.
- Existing clinical content and data behavior remain unchanged.
- Existing route URLs under `/ehr/[tab]` remain supported.
- Provider and patient role boundaries remain intact.
- No production deployment occurs until the layout is reviewed and approved.

## Verification after layout

After the shell/navigation is approved, test the EHR function-by-function beginning with patient creation/record access and the unresolved patient invitation/portal-access workflow, then continue through chart binding, intake/consents, biopsychosocial assessment, treatment planning, assessments, follow-up notes, scheduling, telehealth, billing, messages, homework, psychoeducation, affirmations, provider trainings, record requests, audit log, and infrastructure.

The synthetic training client must not be treated as an ordinary patient record during final verification; its intended placement is Provider Trainings.
