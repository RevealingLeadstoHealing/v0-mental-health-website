# Voicemail callback source — not activated

This optional Chime SIP media application Lambda callback implements a voicemail-only flow. It does not yet ring a provider, place outbound calls, provision a number, or expose an EHR inbox/playback endpoint. Package evaluation may change the chosen telephone service; no purchase or routing change has been made.

`index.mjs` uses the existing DynamoDB SDK dependencies. Bundle both modules and those dependencies for a Node.js Lambda deployment. Configure the required environment variables listed in `index.mjs` from verified AWS resource outputs. The telephone media region and clinical DynamoDB region may differ and are explicitly separate. The provider ID is the assigned Cognito subject, not a display name.

Before activation:

- Restrict Lambda invocation to the chosen Chime SIP media application with an account-scoped resource policy. Do not expose a public function URL. Event validation does not replace IAM authentication.
- Provide a private, encrypted S3 voicemail bucket with the AWS-required Voice Connector write permissions scoped to the account and voicemail prefix. Confirm supported bucket ownership/ACL and encryption settings in a synthetic call before accepting messages. Do not add permissions to the clinical document bucket by assumption.
- Scope the worker's DynamoDB GetItem/PutItem permissions to the practice partition in the existing clinical table. Message state uses `VOICE_CALL#`, outside generic chart records. No caller-number-based patient attachment occurs.
- Configure the Chime/Polly service-linked permissions for the greeting. Source: https://docs.aws.amazon.com/chime-sdk/latest/dg/speak.html
- Configure media writing using the current RecordAudio requirements. Source: https://docs.aws.amazon.com/chime-sdk/latest/dg/record-audio.html
- Add provider-authorized inbox/playback and audit logging before exposing this feature in the EHR.
- Handle S3 object-created reconciliation for recordings whose final callback is lost, including caller hangup; until then these calls remain explicitly unconfirmed. Apply an approved retention policy and recovery monitoring.
- Complete a real synthetic call covering greeting, recording, caller hangup, duplicate callbacks, storage failure and retrieval. Unit tests only verify the callback logic.

No AWS resources or environment settings have been changed by adding this source.
