import test from 'node:test';
import assert from 'node:assert/strict';
import { captureLanguageOptions } from '../lib/ehr/interpreter-capture.ts';

test('Spanish enables identification across English and US Spanish, biased to English', () => {
  assert.deepEqual(captureLanguageOptions('es'), { identify: true, languageOptions: 'en-US,es-US', preferred: 'en-US' });
  assert.deepEqual(captureLanguageOptions('es-US'), { identify: true, languageOptions: 'en-US,es-US', preferred: 'en-US' });
});

test('English or unknown languages keep English-only capture', () => {
  assert.deepEqual(captureLanguageOptions('en'), { identify: false });
  assert.deepEqual(captureLanguageOptions('en-US'), { identify: false });
  assert.deepEqual(captureLanguageOptions(''), { identify: false });
  assert.deepEqual(captureLanguageOptions('xx'), { identify: false });
});

test('another mapped language maps to its streaming dialect', () => {
  assert.deepEqual(captureLanguageOptions('fr'), { identify: true, languageOptions: 'en-US,fr-FR', preferred: 'en-US' });
  assert.deepEqual(captureLanguageOptions('pt'), { identify: true, languageOptions: 'en-US,pt-BR', preferred: 'en-US' });
});
