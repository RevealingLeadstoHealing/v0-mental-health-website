import test from 'node:test';
import assert from 'node:assert/strict';
import { updateLiveCaptions } from '../lib/ehr/live-captions.ts';
const result = (id: string, text: string, partial = false, speaker = 'self', start = 1) => ({ resultId: id, isPartial: partial, startTimeMs: start, alternatives: [{ transcript: text, items: [{ attendee: { attendeeId: speaker } }] }] });
test('partial captions are replaced by final words without duplication or regression', () => {
  let lines = updateLiveCaptions([], [result('1', 'I feel', true)], 'self');
  lines = updateLiveCaptions(lines, [result('1', 'I feel better')], 'self');
  lines = updateLiveCaptions(lines, [result('1', 'I feel', true)], 'self');
  assert.equal(lines.length, 1);
  assert.equal(lines[0].text, 'I feel better');
  assert.equal(lines[0].partial, false);
});
test('both speakers appear in chronological order without guessing clinical roles', () => {
  const lines = updateLiveCaptions([], [result('2', 'How are you?', false, 'self', 20), result('1', 'Hello', false, 'other', 10)], 'self');
  assert.deepEqual(lines.map(line => line.speaker), ['Other participant', 'You']);
});
test('caption window is bounded and empty AWS alternatives are ignored', () => {
  const lines = updateLiveCaptions([], Array.from({length: 150}, (_, i) => result(String(i), 'words', false, 'self', i)), 'self');
  assert.equal(lines.length, 100);
  assert.equal(lines[0].id, '50');
  assert.deepEqual(updateLiveCaptions(lines, [{resultId: 'blank', isPartial: false, startTimeMs: 200, alternatives: []}], 'self'), lines);
});
