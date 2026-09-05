# In-EHR calling activation and business communications

## Implemented source

- Authenticated Amazon Chime SDK audio/video room in provider and client Telehealth pages.
- Provider opens a client-specific room. Cognito authentication, role checks and chart assignment apply before every room operation.
- Server-generated meeting IDs. Attendee join tokens returned only to the joining authenticated user, never stored in generic chart modules or audit logs.
- Room creation uses a conditional DynamoDB reservation; expired rooms cannot be joined through the API. Provider/owner end controls and participant leave controls are separate.
- Device preview, microphone mute, camera on/off, leave and end actions.
- Client recording consent and provider attestation required. Provider mixes the local microphone and received room audio into an Opus/WebM recording and uploads through the existing HealthScribe endpoint after stopping. Patient withdrawal updates server state and sends a live stop message. Polling also stops recording on lost consent, expired room or status failure.
- Recording is audio only; no video recording. Local preview records nothing. The legacy standalone scribe button is labeled local microphone only and disabled while the native room is active.
- Recording stops at 90 minutes or 40 MiB. Failed uploads are held in page memory for retry; closing the page loses unsent audio. Browser/tab termination is not a durable server-side recording solution.
- Phone and fax are explicitly not connected. No carrier credentials or number have been configured, and no number has been purchased or ported.

## AWS activation

1. In the existing AWS account, confirm the service is covered by the practice's AWS agreement and deployment requirements.
2. Deploy `infra/aws/rlth-ehr-telehealth-runtime.yaml`, supplying the existing **Amplify SSR compute role name**, not the deployment role. Existing DynamoDB GetItem/PutItem/UpdateItem and audit permissions must remain.
3. In Amplify's environment settings set `EHR_NATIVE_TELEHEALTH_ENABLED=true` and `EHR_TELEHEALTH_REGION=us-east-1`. These are non-secret settings and are included in the existing build allowlist. Redeploy the AWS production branch.
4. Keep Spruce or another functioning service until the release checks below pass. Chime SDK usage creates AWS usage charges; no subscription or phone number is created by this code.

The source ships with native calling disabled unless explicitly activated. A compiled UI or a successful deployment is not proof that calls work.

## Required two-device synthetic test before appointments

- Provider assigned to the synthetic client opens the room; the client's own signed-in portal joins on another device/network. Confirm two-way audio, camera, mute, camera-off audio-only mode and reconnect.
- Verify a different client, unassigned provider, billing role, unauthenticated browser and different practice cannot obtain room credentials.
- Test both creation requests at once, attendee rejoin, participant leave and host end. Ended/expired rooms must not issue new attendee tokens.
- Record only synthetic spoken content after both parties consent; confirm both speakers appear in the returned transcript. Withdraw client consent mid-recording and verify capture stops. Test network loss, denied device access, upload retry and page navigation.
- Confirm the HealthScribe job completes, draft remains unsigned, and the existing temporary-audio deletion workflow operates. Inspect AWS media region, storage, logs and retention with the practice administrator.
- Check Safari/browser support and mobile behavior. This version specifically requires Opus/WebM MediaRecorder support for session recording; unsupported recording must show an error and must not silently record only one side.

## Business phone and fax: concrete next integration

A carrier is required even when all user controls live inside this EHR. Telnyx is a candidate because it offers WebRTC/voice and programmable fax. Confirm eligible services and execute the required agreement before sending clinical information.

- Decide whether to port the existing Spruce business number or use a new number. Confirm ownership, port eligibility and whether voice and fax need separate numbers. Do not cancel Spruce until a completed port and inbound/outbound tests pass.
- Provision a voice/WebRTC connection, outbound profile, number, emergency-calling configuration and account restrictions. Store API credentials in a server-side secret store. Issue short-lived browser tokens only after provider authentication; do not put carrier API keys in `.env.production`, public variables, Git or a client bundle.
- Provision the fax application and fax-capable number. Implement signed webhook validation, timestamp/replay protection and idempotent delivery-event storage before exposing Send Fax.
- For fax send, require explicit destination confirmation and chart-document authorization. Fetch documents server-side from existing protected storage, preserve delivery outcomes and audit metadata, and retain content only according to practice policy. Incoming faxes need a restricted unassigned inbox and deliberate patient-chart assignment.
- Do not infer successful delivery from an API acceptance response. Implement delivered/failed status from authenticated carrier events, billing/usage reporting and retry controls.
- Add incoming/outgoing call UI, caller identification, caller-ID configuration, voicemail policy and explicit consented recording behavior. Carrier setup, rates, number porting and fax delivery cannot be validated without the account.

Sources: https://docs.aws.amazon.com/chime-sdk/latest/dg/create-iam-users-roles.html ; https://developers.telnyx.com/docs/programmable-fax/quickstart ; https://telnyx.com/resources/architecting-hipaa-telnyx
