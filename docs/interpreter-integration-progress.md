# Interpreter integration progress

Local implementation, September 3, 2026. Not deployed or clinically verified.

Implemented server action: `POST /api/ehr/telehealth`, action `translate-caption`.
Requires the normal authenticated client access, same-origin request, current room session ID,
joined attendee, active recording and recording consent. Request fields are `clientId`,
`sessionId`, `captionId`, `text`, `partial: false`, `sourceLanguage`, `targetLanguage`,
and optional `spoken: true`. Languages must be Amazon Translate language codes.
The original caption is not overwritten. Text goes to Translate; optional speech goes to Polly.
The response includes translated text and optional MP3 bytes encoded as base64.
Consent and membership are checked again before results are returned. Audit records include
the room session and languages, never the caption text. This uses the existing room session
identifier; a durable interpreter-use summary is still required.

Caption controls are now connected locally: original/translation/both display, region-provided
Translate language choices and optional local audio. Requests run in order with a bounded queue.
Changing language, consented recording state, caption state or session cancels pending work.
Original captions remain visible on errors. Existing captions are not replayed aloud when
preferences change. The production build passes; rendered and two-party checks remain pending.

Two-way interpreter update (this change):

- Capture is now bidirectional. The telehealth `captions` action starts Chime transcription with
  `EngineTranscribeSettings.IdentifyLanguage: true` and `LanguageOptions: 'en-US,<dialect>'`
  (biased with `PreferredLanguage: 'en-US'`) when the interpreter is on with a non-English target,
  so both English and the selected language are recognized. English or an unmapped language falls
  back to the previous English-only `LanguageCode: 'en-US'` capture. Mapping lives in
  `lib/ehr/interpreter-capture.ts`. For Spanish this sends `en-US,es-US`.
- Translation direction is chosen per utterance by the DETECTED source language carried on each
  `CaptionLine.languageCode`. English speech translates to the other party's language (and is
  spoken aloud to the client via Polly); the other language translates back to English for the
  provider. The read-aloud path no longer gates on the speaker label, so the provider's own
  English is synthesized in the client's language and played through the `<audio>` element.
- Spoken output uses the Polly voice matched to the destination language. For US Spanish the
  matcher selects **Lupe** (supports standard/neural/generative). Verified via
  `polly describe-voices --language-code es-US` in us-east-1 (profile rlth-prod).
- IAM role `rlth-prod-amplify-ssr-compute` policy `rlth-live-captions-transcription` already grants
  `chime:StartMeetingTranscription`, `chime:StopMeetingTranscription`, `transcribe:StartStreamTranscription`.
- The standalone English SOAP scribe (`app/api/ehr/scribe/captions/route.ts`,
  `use-microphone-captions.ts`) is unchanged and remains English-only; the clinical note stays English.

Remaining before activation:

- Verify both participants' caption controls, cancellation, deduplication, ordered audio
  playback, target language selection and local headphone audio in a rendered review build.
- Confirm multilingual Chime streaming identification latency and accuracy in a live two-party
  session. Preserve original-language caption metadata.
- Add verified language/locale mapping and preferred voice selection. Current voice matching
  handles matching base language codes only; some AWS services use different identifiers.
- Verify deployed compute-role Translate/Polly permissions, request quotas and request throttling.
- Persist interpreter-use start/end and language changes under the clinical encounter.
- Test both participants, consent withdrawal during processing, disconnects, audio feedback,
  delayed results and recovery using synthetic content before real patient use.
- Restore the authorized GitHub publishing connection, deploy a review build and verify it.

This work does not establish interpreter reimbursement eligibility or change chart review,
retention, phone/fax or email configuration.
