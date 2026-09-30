import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { indexCodes, searchCodes, psychotherapyTimeGuidance } from '../lib/ehr/code-search.ts';
const data = JSON.parse(fs.readFileSync(new URL('../public/ehr-codes/icd10cm-2026-04.json', import.meta.url), 'utf8'));
const codes = indexCodes(data.codes.map(([code, label]: string[]) => ({ code, label })));
test('official catalog covers specialties and codes beyond the former shortlist', () => {
  assert.equal(codes.length, 74719);
  for (const query of ['anx', 'demen', 'autis', 'F64', 'adhd', 'ptsd', 'eating']) assert.ok(searchCodes(codes, query).total > 0, query);
  assert.ok(searchCodes(codes, 'F').total > 50);
  assert.equal(searchCodes(codes, 'F', 100).matches.length, 100);
  assert.equal(searchCodes(codes, 'F411').matches[0].code, 'F41.1');
});
test('time guidance handles psychotherapy thresholds without inferring diagnostic-evaluation duration', () => {
  for (const n of [16, 30, 37]) assert.match(psychotherapyTimeGuidance(n), /90832/);
  for (const n of [38, 45, 52]) assert.match(psychotherapyTimeGuidance(n), /90834/);
  for (const n of [53, 60, 90]) assert.match(psychotherapyTimeGuidance(n), /90837/);
  assert.doesNotMatch(psychotherapyTimeGuidance(15), /9083[247]/);
  assert.equal(psychotherapyTimeGuidance(''), '');
});
test('short keywords list behavioral-health categories first', () => {
  const first = (query: string) => searchCodes(codes, query, 10).matches.map(item => item.code);
  assert.ok(first('anx').every(code => code.startsWith('F4') || code.startsWith('F06')), first('anx').join());
  assert.ok(first('anx').includes('F41.1'));
  assert.ok(first('dep').every(code => /^F3[234]/.test(code)), first('dep').join());
  assert.ok(first('alc').every(code => code.startsWith('F10')));
  assert.ok(first('opi').every(code => code.startsWith('F11')));
  assert.equal(first('adj')[0], 'F43.20');
  assert.ok(searchCodes(codes, 'panic').matches.every(item => !item.label.toLowerCase().includes('tympanic')));
  assert.ok(searchCodes(codes, 'dys').categories.some(category => category.name === 'Depressive disorders'));
});
