# Telehealth Whole-Chain — Reconciliation Audit Result

Branch: `aws-ehr-production` · HEAD at audit: `ca7db3e` · Baseline green: `6f3bed1` (Amplify job 220 = SUCCEED).

## Outcome

All five chain items are present, wired, and un-gated at HEAD `ca7db3e`. Every guard the trace map flagged is already reconciled. **No source-code change was required** (the plan's expected outcome). The proven top-mic AI-scribe is the primary documentation path; the Chime video room is strictly additive and never gates documentation. **Nothing was removed or moved.**

## Per-item confirmation (exact condition text re-read in the file)

1. **VIDEO + CAMERA** — `app/ehr/native-telehealth-room.tsx`
   - `join()` → `startSelfView()` (getUserMedia) → self-view bound via `bindSelfView` callback ref; renders `{connected && selfViewOn && <video ref={bindSelfView} … aria-label="Your camera" />}`.
   - Join gate: `joinDisabled = busy || !status?.configured || (provider ? !providerConsent : !consent || !status?.active)` — **no `externalRecording` for provider.**
   - Click feedback present: `onClick={() => { setCameraNotice('Joining the room…'); void join(); }}`; amber `joinDisabledReason` shown when disabled. The "room is open. Join when ready" line is the normal pre-join poll notice, not a stuck state.

2. **RECORDING (top-mic primary, in-room secondary)** — `app/ehr/full-production-interface.tsx`, `app/ehr/native-telehealth-room.tsx`
   - Top mic button: `disabled={appointmentBlocked || isAudioBusy || awsScribeJob.status === "IN_PROGRESS" || !sessionForm.consentObtained || !sessionForm.recordingConsent || !activeClientId}` — **no `nativeCallActive`.**
   - "Upload an existing audio file" input: no room guard.
   - `recordingBlockedReason`: no `nativeCallActive` branch.
   - In-room `startRecording` → on stop `upload(blob)` → `onRecordingReady` (= parent `uploadAudioAndStartHealthScribe`). Poll auto-stop: `const clientWithdrew = !provider && !next.clientRecordingConsent` — a solo provider is not auto-stopped.
   - Server `recording` action: `if (body.active === true && body.recordingConsent !== true) throw 409` — **no `clientRecordingConsent` second-device requirement.**

3. **TRANSCRIBER** — `app/ehr/full-production-interface.tsx`, `app/api/ehr/scribe/**`
   - `uploadAudioAndStartHealthScribe` → `/api/ehr/scribe/upload` → `/api/ehr/scribe/jobs`; `checkHealthScribeJob` surfaces `COMPLETED`/`FAILED`/`NO_TRANSCRIPT`/`RETRIEVAL_ERROR`; completed words render in "Recorded words — completed transcript".
   - `git diff --stat 6f3bed1 HEAD -- app/api/ehr/scribe` is **empty** (unchanged since verified baseline).
   - Empty transcript when no real speech = `NO_TRANSCRIPT` by design, not a bug.

4. **TRANSLATOR** — `full-production-interface.tsx` → `native-telehealth-room.tsx` → `live-caption-panel.tsx` → `interpreter-captions.tsx`
   - Top-of-page controls set `translationEnabled/translationLanguage/translationSpoken`, passed as `initialTranslationEnabled/Language/Spoken` to `<NativeTelehealthRoom>`, threaded to `<LiveCaptionPanel initialEnabled/Target/Spoken>` → `<InterpreterCaptions>` (seeds `target/enabled/spoken`).
   - `InterpreterCaptions` loads languages via `request('interpreter-languages')` and translates each final caption via `request('translate-caption', …)`.
   - Server `interpreter-languages`: provider/owner relaxation — skips the joined-attendee gate when `canManageTelehealth(actor.role)` so the 76 languages list before joining. Translation is additive; it never gates documentation.

5. **DRAFT → CHART** — `app/ehr/full-production-interface.tsx`
   - `saveStructuredDraftToChart` writes `status: "Unsigned draft - provider review required"`, `signature: null`, prefilled `codeDraft`, `await flushClientModuleSaves(activeClientId)`, then `if (isProvider && !isIntakeTemplate(scribeTemplate)) setPage("notes", { clientId: activeClientId, noteId: generatedDocs.draftId })`.
   - Button text: "Save reviewed draft and open in client's progress note"; gated only by `savingDraft || !reviewConfirmed || microphoneTest`. **Never auto-signs** (signature stays `null`).

## Cross-cutting guards — final state

- `nativeCallActive` on the top mic recorder / upload input / `recordingBlockedReason` → **removed (ca7db3e).**
- `externalRecording` on provider Join → **removed (6f3bed1).**
- `clientRecordingConsent` second-device requirement on `recording`/`captions`/poll auto-stop → **relaxed for solo provider (6f3bed1→HEAD).**
- `nativeCallActive || isAudioRecording || …` on the appointment/client/status selectors and the leave-guard → **kept intentionally** (do not switch client mid-session). It never disables the documentation chain itself.

## [AWS-RECHECK] — config-only, could not verify live

`aws sts get-caller-identity --profile rlth-prod` returned **"Your session has expired. Please reauthenticate using 'aws login'."** Per plan constraints, no login was performed and no code was changed to work around env. Run these with a live token:

```
aws --profile rlth-prod --region us-east-1 amplify get-branch --app-id <APP_ID> --branch-name aws-ehr-production   # confirm EHR_NATIVE_TELEHEALTH_ENABLED=true in environmentVariables
aws --profile rlth-prod --region us-east-1 s3api head-bucket --bucket <EHR_HEALTHSCRIBE_BUCKET>                    # HealthScribe bucket exists
aws --profile rlth-prod --region us-east-1 iam get-role --role-name <EHR_HEALTHSCRIBE_DATA_ROLE>                   # HealthScribe data role exists
aws --profile rlth-prod --region us-east-1 iam list-attached-role-policies --role-name rlth-prod-amplify-ssr-compute # rlth-caption-translation (Translate/Polly) attached
```

If `EHR_NATIVE_TELEHEALTH_ENABLED` is not `true`, the fix is to run `.github/workflows/activate-ehr-telehealth.yml` — **not a code edit.**

`amplify.yml` SSR env allowlist confirmed to include: `EHR_NATIVE_TELEHEALTH_ENABLED`, `EHR_TELEHEALTH_REGION`, `EHR_HEALTHSCRIBE_REGION`, `EHR_HEALTHSCRIBE_BUCKET`, `EHR_HEALTHSCRIBE_KMS_KEY_ARN`, `EHR_HEALTHSCRIBE_DATA_ROLE_ARN`, `EHR_HEALTHSCRIBE_ORCHESTRATOR_ARN`.

## Build / verification signal

Node/tsc/pnpm are not installed locally; there is no runnable local build/test. The only build signal is the Amplify job for the pushed commit. No source file changed from `ca7db3e`, so the baseline Amplify job 220 / `6f3bed1` = SUCCEED (and `ca7db3e` which built on it) remains the type-check/build evidence. No local build was run.
