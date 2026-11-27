# Reliable camera-on-join, caption IAM root cause, and leave-Telehealth guard

This change targets the live telehealth failures: it adds a direct `getUserMedia` self-view so joining shows the provider her own camera without a separate Preview step, makes a disabled Join button explain itself instead of doing nothing, corrects the live-captions IAM-as-code to the wildcard-only resource shape that Chime/Transcribe actually require, and adds an in-app navigation guard that warns before leaving Telehealth during a live recording or room. The companion `findings.md` also records a billing-readiness review and an AI-draft-to-chart review where no code change was made. The approach is deliberately conservative: it avoids touching HealthScribe recording/upload, consent gating, and auto-sign logic, and it layers the self-view beside the existing Chime pipeline rather than replacing it.

Watch for: the self-view binds its camera stream to a `<video>` element that is not mounted yet at bind time, so the headline "join shows your own video" fix **does not actually display video** as written (confirmed). A second-order camera-contention risk between the self-view stream and Chime's `startVideoInput` (likely). The findings doc is otherwise well-grounded against the diff.

**Verdict**: CHANGES_REQUESTED

## High-level view

The self-view is the heart of this change and where it breaks. `startSelfView()` acquires a camera stream and assigns it to `selfView.current.srcObject`, but that `<video>` element only renders when `connected && selfViewOn` are both true. At the moment `startSelfView()` runs inside `join()`, `connected` is still false, so the element is not in the DOM, `selfView.current` is `null`, the `srcObject` assignment is skipped, and nothing ever re-binds the stream once the element mounts on connect. The provider gets a dark box — the same symptom reported. The `toggleCamera` path reuses `startSelfView()` but runs only while already connected, so it works; the inconsistency is specifically the join path.

A related hardware concern: `startSelfView()` opens its own `getUserMedia({video:true})` handle and keeps it, then the code immediately asks Chime to `startVideoInput` on the same physical camera. On devices that don't allow two concurrent opens this can surface as a `NotReadableError`, which would now be reported to the provider as "the other participant will not see your video" even when the real cause is the self-view holding the device.

The Join-button messaging and the leave-Telehealth guard are sound. Every disabled reason now has visible text, and the guard reads live recording/room/transcription state through a ref the Telehealth page registers, returning a confirm string the router honors. The IAM-as-code correction to `Resource: "*"` matches the documented wildcard-only behavior of the three transcription actions and is a repo-only edit, consistent with the "no live IAM changed, additive-only" constraint. The billing and draft-to-chart sections of findings are review-only and check out against the code they cite.

<details>
<summary>Issues (3)</summary>

1. **Self-view never binds on join (blocking)** — `startSelfView()` sets `srcObject` while the self-view `<video>` is unmounted (`connected` still false), so the stream is never attached once the element appears. Bind via a callback ref or a `useEffect` keyed on `connected && selfViewOn` that assigns `selfViewStream.current` to the element on mount. Without this the headline fix does not show video.
2. **Camera double-open contention (likely)** — the self-view holds a `getUserMedia` video handle while Chime's `startVideoInput` opens the same camera; on single-open devices this throws and is misreported as a Chime failure. Share one stream (pass the self-view track to Chime) or stop the self-view handle before `startVideoInput`, or at minimum distinguish the error message.
3. **Guard misses the HealthScribe upload window (possible)** — the leave guard warns on `IN_PROGRESS` transcription but not while an audio blob is uploading (`uploading`/`retryAudio` state lives in the room component, not visible to the page-level guard); leaving mid-upload could drop the recording. Confirm whether upload spans the page lifetime and, if so, extend the guard.

</details>

<details>
<summary>Details</summary>

### Self-view mounts empty on join

The intended behavior is that clicking Join turns the camera on and shows the provider her own video with no Preview step. The implementation adds `startSelfView()`, which stops any prior self-view, calls `getUserMedia({video:true,audio:false})`, stores the stream in `selfViewStream.current`, sets `selfViewOn=true`, then reads `selfView.current` and assigns `element.srcObject = stream`.

The render gate for that element is:

```tsx
{connected && selfViewOn && <div><video ref={selfView} .../><p>You</p></div>}
```

Inside `join()`, `startSelfView()` is awaited in the `if (video)` block, which runs before `meeting.audioVideo.start()`. `setConnected(true)` only fires later, in the `audioVideoDidStart` observer. So the ordering at bind time is:

```
join(): startSelfView()  -> selfViewOn=true, connected=false
                            -> element = selfView.current === null  (not in DOM)
                            -> srcObject assignment SKIPPED
...
audioVideoDidStart: setConnected(true) -> <video> mounts, but srcObject was never set
```

`selfView` is a plain object ref with no callback and there is no `useEffect` watching `connected`/`selfViewOn` to re-bind, so the mounted element stays empty. The stream is live and held, but nothing is displayed. This reproduces exactly the "no video unless I click preview" report the task is trying to resolve. The fix is to bind on mount — a callback ref (`ref={el => { if (el && selfViewStream.current) el.srcObject = selfViewStream.current; }}`) or an effect keyed on `connected && selfViewOn`.

`toggleCamera` calls the same `startSelfView()`, but the camera controls only render while `connected`, so the element already exists there and binding succeeds. That is why toggling the camera off/on would show video while the initial join would not — a behavioral asymmetry that points straight at the mount-timing gap.

### Camera opened twice on the same device

`startSelfView()` keeps its own `getUserMedia` video handle open for the lifetime of the self-view. Immediately after, the join path runs a `probe` `getUserMedia` (stopped right away, fine) and then `meeting.audioVideo.startVideoInput(cameras[0].deviceId)` to feed Chime. On hardware that permits only one open handle per camera, the second open fails with `NotReadableError`. The catch now sets "The other participant will not see your video" — which would mislead: the remote path failed because the self-view is holding the device, not because of a Chime problem. Sharing a single `MediaStream` track between the self-view element and Chime, or releasing the self-view handle before `startVideoInput`, avoids the contention; alternatively the message should name device-busy as a cause.

### Leave-Telehealth guard

The guard is registered from the Telehealth page via a ref the `PageProvider` exposes (`registerTelehealthLeaveGuard`), and `setPage` consults it on any navigation away from `telehealth`, showing `window.confirm` with the returned message and aborting if the provider cancels. The three covered states — microphone recording (`isAudioRecording || isScribeTimerRunning`), live room (`nativeCallActive`), and `awsScribeJob.status === "IN_PROGRESS"` — map to the real session resources that unmount-on-navigate would tear down. Using a ref keeps it out of render, and the effect cleanup clears the guard when the session ends.

One gap: the audio-upload window after a recording stops lives inside `NativeTelehealthRoom` (`uploading`/`retryAudio`), which the page-level guard cannot see. If a provider navigates away while a blob is still uploading to HealthScribe, the guard would not warn. Whether this matters depends on whether upload can still be in flight after `IN_PROGRESS` clears; worth confirming, since a dropped upload is the kind of silent loss this guard exists to prevent. Flagged as possible, not confirmed, because the upload may complete before navigation is realistic.

### Join-button messaging

Previously the only message under a disabled Join was the provider-consent hint; a Join disabled because of active recording/transcription or an unconfigured room was silent, matching the "button does nothing, no message" report. The change adds a mutually-exclusive set of `role="status"` lines covering external recording/blocked appointment, not-configured, provider-consent-missing, client waiting-for-room, and client-consent-missing. The button's gating expression is unchanged, so who can join and the microphone-test rule are untouched — purely additive explanation.

### Transcription IAM as code

The YAML now grants `chime:StartMeetingTranscription`, `chime:StopMeetingTranscription`, and `transcribe:StartStreamTranscription` on `Resource: "*"` with a comment explaining these are wildcard-only actions whose authorization never matches a `meeting/*`-scoped ARN. This matches the documented IAM behavior and the findings' simulator evidence, and it reconciles the repo with the live inline policy `rlth-live-captions-transcription`. The edit is to `infra/aws/rlth-ehr-live-captions.yaml` only — no live IAM mutation in this diff — which satisfies the "additive inline policy on rlth-prod-amplify-ssr-compute, no live changes here" constraint. The policy rename (`rlth-live-captions` -> `rlth-live-captions-transcription`) is cosmetic in the template; on a future CloudFormation apply it would replace the managed policy, which is the intended reconciliation.

### Findings cross-check (billing and draft-to-chart)

The billing-readiness section is review-only and holds up against the code it cites: `providerNpiForName`/`providerIdentifiersForName` resolve the rendering provider's NPI and license into the claim and 837P builders, and the transmit path is gated on connected + production clearinghouse. `EHR_CLEARINGHOUSE_SECRET_ARN` being unset leaves Stedi disconnected and the transmit route returning 503 — not faked, per the constraint. The NPI 1417470964 in findings is an assertion about runtime data resolved through `provider-signature`; the resolver wiring is present, the specific value is data this review did not execute. The draft-to-chart section is likewise review-only; no code changed, and the task's "never auto-sign" constraint is not touched by this diff. These sections are consistent with the single commit message's scope.

</details>

<details>
<summary>Files changed</summary>

- `app/ehr/native-telehealth-room.tsx` — adds self-view (`startSelfView`/`stopSelfView`, lifecycle in join/toggle/disconnect), filters the duplicate local Chime tile, rewrites disabled-Join messaging. Contains the self-view bind-timing bug.
- `app/ehr/full-production-interface.tsx` (`// @ts-nocheck`) — adds `registerTelehealthLeaveGuard` on `PageProvider`, a `setPage` confirm gate, and the Telehealth-page guard effect.
- `infra/aws/rlth-ehr-live-captions.yaml` — transcription actions regranted on `Resource: "*"`, policy renamed, explanatory comment.
- `.agents/tasks/telehealth-billing-final/findings.md` — new findings report (reviewed for diff consistency).
- `.gitignore` — ignores `.agents/tmp/` scratch output.

Full diff: `git diff origin/aws-ehr-production...HEAD`

</details>
