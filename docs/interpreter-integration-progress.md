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

Remaining before activation:

- Verify both participants' caption controls, cancellation, deduplication, ordered audio
  playback, target language selection and local headphone audio in a rendered review build.
- Confirm multilingual Chime streaming behavior and language coverage before offering a language.
  The deployed caption startup still uses English. Preserve original-language caption metadata.
- Add verified language/locale mapping and preferred voice selection. Current voice matching
  handles matching base language codes only; some AWS services use different identifiers.
- Verify deployed compute-role Translate/Polly permissions, request quotas and request throttling.
- Persist interpreter-use start/end and language changes under the clinical encounter.
- Test both participants, consent withdrawal during processing, disconnects, audio feedback,
  delayed results and recovery using synthetic content before real patient use.
- Restore the authorized GitHub publishing connection, deploy a review build and verify it.

This work does not establish interpreter reimbursement eligibility or change chart review,
retention, phone/fax or email configuration.
