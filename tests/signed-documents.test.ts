import assert from 'node:assert/strict';
import test from 'node:test';
import { signedDocumentCopy } from '../lib/ehr/signed-document-copy.ts';
import { mergeClientModuleValue } from '../lib/ehr/client-record-policy.ts';
const actor = { sub: 'client-user', name: 'Synthetic Client', practiceId: 'practice-a' };

test('copies exclude provider-only signatures and unrelated private chart fields', () => {
  assert.equal(signedDocumentCopy({ id: 'private', signature: { role: 'Provider', signedAt: '2026-09-01' } }), null);
  const copy = signedDocumentCopy({ id: 'consent', title: 'Consent', generatedLetterText: 'Terms actually signed', privateNotes: 'hidden', signatures: [{ role: 'Client', signer: 'Synthetic Client', signedAt: '2026-09-01' }] });
  assert.equal(copy?.text, 'Terms actually signed');
  assert.equal('privateNotes' in copy!, false);
});

test('viewing or retrying a signed form does not replace the original client signature date', () => {
  const original = { id: 'consent', title: 'Telehealth Consent', generatedLetterText: 'Original terms', signature: { role: 'Client', signer: actor.name, signedAt: '2026-08-01' } };
  const [saved] = mergeClientModuleValue('documents', [original], [{ ...original, generatedLetterText: 'Altered terms', signature: { signer: 'Spoofed' } }], actor, 'chart-a') as any[];
  assert.equal(saved.signature.signedAt, '2026-08-01');
  assert.equal(saved.generatedLetterText, 'Original terms');
});

test('client uploads cannot manufacture an authenticated signed-copy record', () => {
  const [upload] = mergeClientModuleValue('documents', [], [{ id: 'upload', storageKey: 'ehr-documents/practice-a/client-chart-a/file.pdf', signatures: [{ role: 'Client', signedAt: 'invented' }], signature: { role: 'Client', signedAt: 'invented' } }], actor, 'chart-a') as any[];
  assert.equal(signedDocumentCopy(upload), null);
});

test('viewing a provider-signed form does not imply client agreement', () => {
  const original = { id: 'consent', title: 'Telehealth Consent', signature: { role: 'Provider', signer: 'Provider', signedAt: '2026-08-01' } };
  const [saved] = mergeClientModuleValue('documents', [original], [{ ...original, viewedAt: '2026-09-01' }], actor, 'chart-a') as any[];
  assert.equal(signedDocumentCopy(saved), null);
  assert.equal(saved.signature.role, 'Provider');
});
