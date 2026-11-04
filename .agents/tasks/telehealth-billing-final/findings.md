# Telehealth + Billing — final findings

Branch `aws-ehr-production`. AWS checks run with profile `rlth-prod` (root, account
597936860711). Node/tsc is not installed locally, so no local build/test was run; the
only build signal is the Amplify job status for the final commit (a later workflow step
pushes and confirms Amplify). Raw AWS command output was written under
`.agents/tmp/` (gitignored).

## 1. Live captions (AccessDeniedException on StartMeetingTranscription)

**Cause (found and proven).** `chime:StartMeetingTranscription`,
`chime:StopMeetingTranscription` and `transcribe:StartStreamTranscription` are
*wildcard-only* IAM actions: the AWS service-authorization reference lists **no resource
type** for `StartMeetingTranscription`/`StopMeetingTranscription`, so a policy statement
that scopes them to an `arn:aws:chime:*:597936860711:meeting/*` resource **never matches**
and the effect is implicitDeny. The original inline policy `rlth-native-telehealth`
granted these two actions scoped to `meeting/*`, which is why they were denied. The newer
inline policy `rlth-live-captions-transcription` grants them on `Resource: "*"`, which is
correct.

The earlier "still implicitDeny" simulator result was a **false alarm**: it was produced
by passing a specific meeting ARN (`--resource-arns arn:aws:chime:...:meeting/...`) to the
simulator for a wildcard-only action. When simulated the way the action is actually
authorized (resource `*`), it is allowed.

**Proof (iam simulate-principal-policy, role rlth-prod-amplify-ssr-compute):**
- `chime:StartMeetingTranscription` -> **allowed** (resource `*`), matched policy
  `rlth-live-captions-transcription`.
- Same action with `--resource-arns .../meeting/<id>` -> implicitDeny (expected artifact
  for a wildcard-only action; not how it is authorized at runtime).
- `chime:StopMeetingTranscription`, `transcribe:StartStreamTranscription` -> allowed.
- `chime:CreateMeeting` -> allowed (resource `*`).
- `chime:CreateAttendee`, `chime:DeleteMeeting`, `chime:GetMeeting` -> allowed when
  simulated against a real `arn:aws:chime:us-east-1:597936860711:meeting/<id>` (matched
  policy `rlth-native-telehealth`). They show implicitDeny only when simulated with no
  resource, because that policy is scoped to `meeting/*` — a simulator artifact, not a
  runtime problem.
- No permissions boundary on the role. Org SCPs are only `FullAWSAccess` and
  `DenyLeaveAndCloseAccount` — neither blocks Chime/Transcribe.
- Service-linked role `AWSServiceRoleForAmazonChimeTranscription` exists.

Live AWS test (root, us-east-1): created a throwaway meeting with
`chime-sdk-meetings create-meeting`, ran `start-meeting-transcription` against it
(exit 0), then `stop-meeting-transcription` and `delete-meeting` to clean up. Root bypasses
IAM, so this only proves the API call shape/region are valid; the role authorization proof
is the simulator above.

**Fix.** The live IAM is already correct (inline `rlth-live-captions-transcription` with
`Resource: "*"`). To keep the repo's infrastructure-as-code from re-introducing the bug on
a future manual redeploy, `infra/aws/rlth-ehr-live-captions.yaml` was corrected to grant
the three transcription actions on `Resource: "*"` (and renamed the policy to
`rlth-live-captions-transcription` to match the live inline policy), with a comment
explaining the wildcard-only behavior. No live IAM was changed in this step.

**Owner still to do.** Nothing for IAM. Only a live in-room test can confirm words appear,
because that depends on real microphone audio reaching Transcribe through Chime.

**Live-test-only:** whether caption words actually render during a real session.

## 2. Translation (interpreter captions)

**Cause.** Translation only runs on finalized in-room captions, so it was blocked purely
because captions were failing. The translate IAM is in place (inline
`rlth-caption-translation`): `translate:TranslateText` simulates **allowed**, and
`translate list-languages` returns 76 languages. The code path
(`app/api/ehr/telehealth` actions `interpreter-languages` and `translate-caption`) requires
the requester to have joined the active consented recording session (`canTranslateCaption`),
then calls `TranslateTextCommand`. Region settings are consistent (MediaRegion and
EngineTranscribeSettings Region both `us-east-1`).

**Fix.** None required in code or IAM. Translation will work once captions produce finalized
caption text, which the item-1 fix enables.

**Live-test-only:** end-to-end translated caption output during a real session.

## 3. Camera on join (self-video)

**Causes.**
(a) The provider's Join button was silently disabled whenever microphone recording /
transcription was active or the appointment was blocked (`externalRecording =
isAudioRecording || isAudioBusy || appointmentBlocked`), with **no message**. That matches
the owner's report of "no video and no message at all" — if she was mid-recording, the
button simply did nothing.
(b) The self-view relied on the Chime local video tile pipeline
(`startLocalVideoTile` -> `videoTileDidUpdate` -> `bindVideoElement`), which had already
failed twice live, while the direct-`getUserMedia` preview path works reliably.

**Fix (app/ehr/native-telehealth-room.tsx).**
- Joining now shows the provider her own camera immediately using the same proven method as
  the preview box: a dedicated `getUserMedia({video:true})` stream bound to a self-view
  `<video>` element (`startSelfView`), independent of the Chime tile pipeline. No separate
  Preview step is needed. Chime still receives its own camera input so the other participant
  sees video; if that Chime input fails, a visible amber message now says the other
  participant will not see video (instead of silently dropping to audio-only).
- The duplicate local Chime tile is filtered out of the remote grid so there is one
  self-view.
- `toggleCamera` and all disconnect paths start/stop the self-view consistently.
- Added visible status text under the Join button for every reason it can be disabled
  (recording/transcription active, not activated, consent not confirmed, room not open yet),
  so a disabled Join is never silent.

**Owner still to do / live-test-only:** confirm in a real browser that clicking Join turns
the camera on and shows her own video, and that the other participant sees her. Camera
hardware/permission behavior can only be confirmed live.

## 4. AI draft to chart ("Save reviewed draft and open in client's progress note")

**Reviewed; no defect found.** `saveStructuredDraftToChart` writes an **unsigned** draft
(`signature: null`, status "Unsigned draft - provider review required") into the client's
`notes`, awaits `flushClientModuleSaves`, then `setPage("notes", { clientId, noteId })`.
`ProgressNotesPage` has an effect keyed on `workflowTarget.noteId`, `workflowTarget.clientId`
**and** `store.users[clientId].notes`, so even if navigation lands before the store commits,
the effect re-runs when the note appears, opens it via `openDraftForCompletion`, and an
`openedDraftRef` guard prevents re-opening. Signing happens only in the Notes `save`
handler. The path is race-safe and never auto-signs. (Navigation is skipped for intake
templates by design; SOAP/Progress/Follow-up navigate correctly.)

**Owner still to do / live-test-only:** click-through confirmation in a browser (the store
and navigation can only be exercised live). No code change was needed.

## 5. Recording persistence while leaving Telehealth

**Determination.** Pages are conditionally rendered and swap on `setPage`, so navigating
from Telehealth to Assessments (to give a GAD-7/PHQ-9) **unmounts** the Telehealth page and
`NativeTelehealthRoom`. That cleanup stops the microphone recording, disconnects the Chime
room, and loses live transcription. So yes — navigating away loses the session today. The
existing `beforeunload` handler only covers full browser-tab unloads, not in-app navigation.

**What was done: WARN BEFORE LEAVING (not full persistence).** Full persistence would
require hoisting the entire recorder + Chime room + HealthScribe state out of the 5,000-line
`@ts-nocheck` Telehealth page into an app-level provider — a large, high-risk refactor that
could break the working HealthScribe recording/upload path, which the task says must not
break. Instead, an in-app navigation guard was added: `PageProvider.setPage` now consults a
guard the Telehealth page registers while a session is live, and shows a `window.confirm`
warning before navigating away when a microphone recording is in progress, the Chime room is
connected, or a HealthScribe job is still transcribing. If she cancels, she stays; if she
confirms, navigation proceeds (and the session ends as before).

**Owner still to do.** If she needs to run an assessment *without* ending the session, that
requires the larger state-hoisting refactor (flagged, not done here). For now, finish/stop
the recording before switching pages, or accept the warning.

**Live-test-only:** the confirm dialog wording/behavior on real navigation.

## 6. Billing readiness

**Signed note -> billable claim line: confirmed correct.** A signed note's codes
(primary/secondary/tertiary ICD-10-CM, CPT/HCPCS service code, session minutes, provider
signature) flow into the client's billing fields; `saveBillingSnapshot` builds a claim and
POSTs it to `/api/ehr/billing`, where it becomes a server claim and enters the two-stage
(clinical + billing) review workflow. Rendering provider NPI resolves to **1417470964** and
license **103235** for Kenseener Carpenter via `providerNpiForName` /
`providerIdentifiersForName` (NPI marked verified against NPPES). The 837P payload builder
(`buildProfessionalClaimSubmission`) maps diagnoses, service lines, units, charge, payer,
insured, billing provider (NPI, EIN, taxonomy, address) and rendering provider correctly for
Stedi's professional-claim JSON API. Transmission is gated: both reviews must pass, patient
demographics must be complete, and the clearinghouse must be in **production** mode.

**No billing bug found to fix.** The transmit path correctly refuses to send when no
clearinghouse is connected and when in test mode, and it does not fabricate acceptance.

**Stedi is not connected (as expected).** `EHR_CLEARINGHOUSE_SECRET_ARN` is not set and
there is no Stedi account/API key. `loadClearinghouseConfig` returns "No clearinghouse is
connected" and `/api/ehr/billing/transmit` returns 503. This was left as-is — not faked.

### Stedi activation steps (what the owner must provide and do)
1. Create a Stedi account at stedi.com and complete healthcare onboarding for professional
   (837P / CMS-1500) claims.
2. Obtain a Stedi **API key** — a test key first, then a production key once Stedi enrollment
   with your payers is complete.
3. In AWS Secrets Manager (us-east-2, same account), create one JSON secret containing:
   - `apiKey`: the Stedi API key
   - `mode`: `"test"` first, then `"production"` to send real claims
   - `billingProvider`: `organizationName`, `npi` (10 digits), `ein` (9 digits),
     `taxonomyCode` (e.g. 1041C0700X for LCSW, format `#########X`), `addressLine1`, `city`,
     `state` (2 letters), `postalCode` (9 digits, ZIP+4), `phoneNumber` (10 digits).
4. Set the Amplify environment variable `EHR_CLEARINGHOUSE_SECRET_ARN` to that secret's ARN
   and grant the compute role `secretsmanager:GetSecretValue` on that ARN (additive inline
   policy on `rlth-prod-amplify-ssr-compute`), then redeploy.
5. In Billing, run **Clearinghouse connection check** (validates a synthetic PHI-free claim)
   — it must pass in test mode.
6. Switch `mode` to `"production"` only after payer enrollment is confirmed; real claims are
   refused until then.

**Live-test-only:** nothing in billing can be end-to-end tested until a Stedi account and key
exist; until then only the local claim-build and the two-stage review are exercisable.

## Summary of code/IaC changes in this run
- `app/ehr/native-telehealth-room.tsx` — reliable self-view on join; visible failure
  messages; filtered duplicate local tile; self-view lifecycle in toggle/disconnect.
- `app/ehr/full-production-interface.tsx` — visible reasons when Join is disabled; in-app
  navigation guard warning before leaving Telehealth during a live session.
- `infra/aws/rlth-ehr-live-captions.yaml` — corrected transcription grant to `Resource: "*"`
  (+`transcribe:StartStreamTranscription`) so IaC matches the working live inline policy.

## Items only a live browser test can confirm
Caption words rendering in-room (1); translated captions end-to-end (2); camera turning on
and self/remote video on join (3); the draft-to-chart click-through (4); the leave-Telehealth
confirm dialog (5). Billing end-to-end (6) is blocked until Stedi is connected.
