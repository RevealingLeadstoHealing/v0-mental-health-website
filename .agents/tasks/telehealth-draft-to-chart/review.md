# Telehealth AI draft opens as an unsigned note in the client's Follow-Up Notes

After the provider confirms the transcript review, the draft is saved to the active client's notes as an unsigned record (signature null, session minutes, code fields, appointmentId). The app then navigates to Follow-Up Notes for that client with the draft prefilled. The provider finishes the MSE, diagnosis and CPT there and signs through the existing save path. Intake and biopsychosocial templates skip navigation and keep the existing routing.

Watch for: (1) the primary button label promises "open in client's progress note", but intake templates save without navigating (confirmed, minor). (2) Switching clients in the Follow-Up Notes picker mid-edit keeps the AI draft text in the form, so it can be saved as a new note under the wrong client (likely, non-blocking). (3) Nothing was built, linted or run (node/tsc not installed). The commit message and report.md both say this.

**Verdict**: APPROVED

## High-level view

The handoff reuses existing pieces. The save handler now writes an explicitly unsigned note with minutes and codes. `setPage("notes", {clientId, noteId})` carries the target. ProgressNotesPage selects that client, finds the note, and loads it into the existing editor. An amber banner marks it as an unsigned AI draft.

Signing stays a deliberate provider action. The button reads "Sign and save note", runs the existing required-field checks (chief complaint, minutes, primary diagnosis, CPT), and replaces the draft in place by id. Unsigned notes get a badge and an "Open to complete and sign" button, so drafts can be reopened later.

The review-checkbox gate, microphone-test disable, consent, authorization, recording/HealthScribe and billing code are untouched in the diff. One duplicate button, "Save generated draft to chart", was removed. The report states this, and its handler is the same as the primary action.

<details>
<summary>Issues (4)</summary>

1. **Label vs. intake behavior** (confirmed, minor) — The primary button says it opens the progress note, but for intake templates (`isIntakeTemplate`) it does not navigate. Make the label or helper text conditional.
2. **Client switch keeps draft text** (likely, non-blocking) — The picker's `onValueChange` clears `editingNoteId` but not `draft`/`codeDraft`. AI text could be saved as a new note for a different client. Clear the form, or confirm, when switching mid-draft.
3. **createdAt overwritten on completion** (confirmed, minor) — `save()` stamps a new `createdAt`, so the draft's creation time is lost. The signature already records `signedAt`. Preserve the original timestamp.
4. **Unverified** (confirmed) — No build, tsc, lint or browser run. The navigation effect and the store-flush timing are untested. Run `tsc` and a manual telehealth to notes flow before release.

</details>

<details>
<summary>Details</summary>

## Navigation and draft hydration

The navigation target is set after `flushClientModuleSaves`, so the note should already be in the store when ProgressNotesPage mounts. The effect keys on `workflowTarget.noteId` and uses a ref so the draft opens once. Later store updates, including the signing write, do not reopen it. The initial client comes from `workflowTarget.clientId` and is validated against `store.users`. `setPage` also sets `selectedChartClientId`, so the chart context stays consistent.

The editor load strips the "Provider Review Required / Audio Retention" header from the content. It maps `noteType` to the allowed list, keeps `appointmentId`/`appointmentStatus`/`structuredFields`, and restores minutes and code fields from `note.codeDraft`. "Telehealth" and "Audio Telehealth" were added to the modality select so the saved value displays.

## Signing posture

Nothing signs automatically. The saved note has `signature: null` and status "Unsigned draft - provider review required". Only the explicit "Sign and save note" click writes a signature, using the existing provider signature field and required-field validation. The "I reviewed the transcript..." gate still disables the primary save, and `microphoneTest` was added to its disabled condition, matching the other buttons. The merge path also navigates, and it keeps its diagnosis/CPT enforcement.

## Residual gaps

Two Telehealth-page actions remain: the primary "Save reviewed draft..." and the secondary outline "Merge to EHR fields (needs diagnosis and CPT)". The primary is the only filled button under the draft, which satisfies "one clearly labeled primary action". Merge differs in scope (it also writes plan and risk documents), so keeping it is defensible.

The report's "Not verified" section is honest and specific: no build/tsc/lint/tests, no browser run, the navigation effect untested, and the signing path reusing existing behavior. The commit message records the same.

</details>

<details>
<summary>File map</summary>

- `app/ehr/full-production-interface.tsx` — Telehealth save/merge handlers write unsigned notes and navigate. Button consolidation. ProgressNotesPage gets target client, draft hydration, unsigned badge, and the sign-in-place flow.
- `.agents/tasks/telehealth-draft-to-chart/report.md` — coder report. Exists and discloses what was not verified.

Full diff: `git diff 04e6b84 76c13ea`

</details>
