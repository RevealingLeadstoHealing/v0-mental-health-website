# Live captions: implementation and activation

The room requests Chime live transcription after consented two-party recording
starts. Chime streams speaker-attributed caption events to meeting participants.
English (en-US) uses Transcribe in us-east-1. Partial captions are replaced by
final results. The most recent 100 caption segments stay in component memory;
they are not persisted or used as clinical-note evidence.

Stopping recording, leaving, client rejoining, or changing client recording
consent stops transcription. Ending the meeting also ends transcription. If
AWS cannot stop transcription, the endpoint closes the meeting to stop capture.
The endpoint rechecks consent after an asynchronous start request.

The existing recorded-audio path is preserved: mixed participant audio uploads
after stopping, AWS HealthScribe returns transcript and clinical documentation,
and the provider reviews the draft before chart merge. The live-caption buffer
does not replace that completed transcript or bypass review.

## AWS activation still requires verification

Inspect the existing app d1mwc7x488m8xn and branch aws-ehr-production. Verify the
assigned SSR compute role and the existence of
AWSServiceRoleForAmazonChimeTranscription. Inspect effective permissions for
chime:StartMeetingTranscription and chime:StopMeetingTranscription before changing
anything. The optional infra/aws/rlth-ehr-live-captions.yaml template adds only
those permissions to the existing compute role if missing. No automation or new
stack is required when existing permissions already suffice. Create the
service-linked role only if confirmed absent; otherwise leave the parameter false.
No existing telehealth variables, clinical regions, database, or authentication
settings need replacement. This file is not proof the stack was applied.

AWS references:
- https://docs.aws.amazon.com/chime-sdk/latest/dg/configure-transcribe.html
- https://docs.aws.amazon.com/chime-sdk/latest/dg/initiate-transcription.html

## Synthetic acceptance test (not yet completed)

1. Use provider and synthetic-client accounts on separate devices in the same room.
2. Confirm both recording consents; start session recording on the provider side.
3. Verify AWS reports captions started and each speaker's spoken words appear.
4. Verify interim words update without duplicate sentences.
5. Stop recording; verify transcription stops and completed audio reaches HealthScribe.
6. Retrieve transcript and clinical draft; verify both speakers against the test script.
7. Keep rehearsal output in provider training resources, outside clinical charts.
   Verify merge behavior only in an isolated test environment with synthetic data;
   do not merge training output into a production clinical chart.
8. Test consent withdrawal, leaving, rejoining, and ending the room. Confirm no
   further words are captured after the stop acknowledgement.

Local tests/build are separate from AWS activation and the acceptance test.
The user reports the unrelated hosting integration has been removed. Deployment
target: the existing AWS Amplify production branch. Confirm its deployment result
separately from the GitHub commit status.

## Local verification

29 focused tests pass for caption events, stop failures, authorization, origin
validation, session refresh, and scribe binding/presentation. A production build
passed. Browser visual verification remains uncompleted: the cloud browser
blocked access to the local synthetic fixture. These checks do not establish
working AWS transcription or two-person audio capture.
