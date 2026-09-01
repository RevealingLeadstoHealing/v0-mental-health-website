import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Amplify forwards every HealthScribe resource setting into the SSR runtime', () => {
  const source = readFileSync(new URL('../lib/ehr/healthscribe.ts', import.meta.url), 'utf8');
  const build = readFileSync(new URL('../amplify.yml', import.meta.url), 'utf8');
  const allowlist = build.match(/grep -E '\^\(([^)]+)\)=/);
  assert.ok(allowlist, 'Expected an explicit runtime configuration allowlist');
  const allowed = new Set(allowlist[1].split('|'));
  const required = [...source.matchAll(/process\.env\.(EHR_HEALTHSCRIBE_[A-Z_]+)/g)].map(match => match[1]);
  assert.ok(required.length > 0);
  for (const setting of required) assert.ok(allowed.has(setting), `${setting} must reach the deployed server`);
});
