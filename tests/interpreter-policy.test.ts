import test from 'node:test';
import assert from 'node:assert/strict';
import { translationInput, canTranslateCaption } from '../lib/ehr/interpreter-policy.ts';
const request = { sessionId: '12345678-1234-1234-1234-123456789abc', captionId: 'caption-1', text: 'Hola', sourceLanguage: 'es', targetLanguage: 'en', partial: false };
test('translation rejects interim words, automatic language guesses, and oversized text', () => {
  assert.ok(translationInput(request));
  assert.equal(translationInput({ ...request, partial: true }), null);
  assert.equal(translationInput({ ...request, sourceLanguage: 'auto' }), null);
  assert.equal(translationInput({ ...request, text: 'あ'.repeat(2000) }), null);
});
test('translation requires the same active room, consent and joined attendee', () => {
  const input = translationInput(request)!;
  const room = { sessionId: input.sessionId, state: 'active', expiresAt: 100, recording: true, clientRecordingConsent: true, captions: true, meeting: { MeetingId: 'meeting' } };
  const member = { attendeeId: 'attendee', meetingId: 'meeting' };
  assert.equal(canTranslateCaption(room, member, input, 99), true);
  assert.equal(canTranslateCaption(room, member, input, 100), false);
  for (const patch of [{ sessionId: 'previous' }, { recording: false }, { clientRecordingConsent: false }, { captions: false }]) {
    assert.equal(canTranslateCaption({ ...room, ...patch }, member, input, 99), false);
  }
  assert.equal(canTranslateCaption(room, { ...member, meetingId: 'previous' }, input, 99), false);
});
