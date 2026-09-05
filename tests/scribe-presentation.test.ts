import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readableTranscript, groundedDraft, isIntakeTemplate } from '../lib/ehr/scribe-presentation.ts';

test('renders AWS speech segments without metadata or invented speaker names', () => {
  const value = { Conversation: { TranscriptSegments: [{ Content: 'Testing one two.', ParticipantDetails: { ParticipantRole: 'PATIENT_0' } }, { Content: 'The timer is not working.' }] } };
  assert.equal(readableTranscript(value), 'Testing one two.\nThe timer is not working.');
  assert.equal(readableTranscript(JSON.stringify(value)), readableTranscript(value));
});
test('rejects malformed service data instead of displaying JSON in a chart', () => {
  assert.throws(() => readableTranscript({ error: 'unavailable' }));
  assert.throws(() => readableTranscript('{broken'));
});
test('empty successful AWS payloads cannot be presented as completed transcripts', () => {
  for (const value of ['', '  ', { Conversation: { TranscriptSegments: [] } }, { Conversation: { TranscriptSegments: [{ Content: ' ' }] } }, { results: { transcripts: [{ transcript: '' }] } }]) {
    assert.throws(() => readableTranscript(value));
  }
});
test('speech items remain readable when AWS has no sentence segments', () => {
  assert.equal(readableTranscript({ Conversation: { TranscriptSegments: [], TranscriptItems: [
    { Type: 'PRONUNCIATION', Alternatives: [{ Content: 'Testing' }] },
    { Type: 'PRONUNCIATION', Alternatives: [{ Content: 'one' }] },
    { Type: 'PUNCTUATION', Alternatives: [{ Content: '.' }] },
  ] } }), 'Testing one.');
});
test('a microphone phrase cannot create a diagnosis or observed affect', () => {
  const note = groundedDraft('Hello hello. The timer is not working.', 'Follow-up Progress Note');
  assert.doesNotMatch(note.content, /schizophrenia|flat affect|thought disorder|disorganized/i);
  assert.match(note.fields.Assessment, /Not documented/);
  assert.equal(note.noteType, 'Follow-up Progress Note');
});
test('follow-up and SOAP never select intake mapping', () => {
  for (const name of ['Follow-up Progress Note', 'Progress Note - SOAP', 'Initial Progress Note', 'Treatment Plan Update']) assert.equal(isIntakeTemplate(name), false);
  assert.equal(isIntakeTemplate('Biopsychosocial'), true);
  assert.equal(isIntakeTemplate('Intake Session'), false);
  assert.ok('Biological / medical history' in groundedDraft('History discussed.', 'Biopsychosocial').fields);
  assert.ok(!('Biological / medical history' in groundedDraft('Follow up.', 'Follow-up Progress Note').fields));
});

test('only summaries traceable to clinical speech are used; visual findings and assessment require provider input', async () => {
  const { supportedClinicalSections } = await import('../lib/ehr/scribe-presentation.ts');
  const transcript = { Conversation: { TranscriptSegments: [
    { SegmentId: 'test', Content: 'Testing hello.', SectionDetails: { SectionName: 'SMALL_TALK' } },
    { SegmentId: 'clinical', Content: 'I slept better this week.', SectionDetails: { SectionName: 'SUBJECTIVE' } },
  ] } };
  const summary = (text: string, id: string) => ({ SummarizedSegment: text, EvidenceLinks: [{ SegmentId: id }] });
  const result = supportedClinicalSections(transcript, { ClinicalDocumentation: { Sections: [
    { SectionName: 'SUBJECTIVE', Summary: [summary('Reports improved sleep.', 'clinical'), summary('Disorganized speech.', 'test'), summary('Invented fact.', 'missing')] },
    { SectionName: 'OBJECTIVE', Summary: [summary('Flat affect.', 'clinical')] },
    { SectionName: 'ASSESSMENT', Summary: [summary('Psychotic disorder.', 'clinical')] },
  ] } });
  assert.deepEqual(result, { Subjective: 'Reports improved sleep.' });
  const note = groundedDraft('I slept better this week.', 'Follow-up Progress Note', result);
  assert.equal(note.fields.Subjective, 'Reports improved sleep.');
  assert.match(note.fields.Assessment, /Not documented/);
});

test('reviewed intake fields map to matching chart keys without overwriting missing history', async () => {
  const { intakeFieldPatch } = await import('../lib/ehr/scribe-presentation.ts');
  const fields = { 'Presenting problem': 'Provider reviewed concern', 'Social history': 'Lives alone', 'Psychological history': 'Not documented — complete from session.' };
  assert.deepEqual(intakeFieldPatch('Follow-up Progress Note', fields), {});
  assert.deepEqual(intakeFieldPatch('Biopsychosocial', fields), { presentingProblem: 'Provider reviewed concern', socialFamilyHistory: 'Lives alone' });
});
