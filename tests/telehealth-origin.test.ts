import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedTelehealthOrigin } from '../lib/ehr/telehealth-origin.ts';

const custom = 'https://ehr.revealing-leads-to-healing-wellness-services.org';
const amplify = 'https://aws-ehr-production.d1mwc7x488m8xn.amplifyapp.com';
function request(origin?: string, url = 'http://localhost:3000/api/ehr/telehealth', extra = {}) {
  return new Request(url, { headers: { ...(origin === undefined ? {} : { origin }), ...extra } });
}

test('both production EHR origins work behind an internal Amplify URL', () => {
  for (const origin of [custom, amplify]) assert.equal(isAllowedTelehealthOrigin(request(origin)), true);
});

test('untrusted origins cannot bypass protection through URL or forwarded headers', () => {
  for (const origin of ['https://untrusted.example', 'null', custom + '.untrusted.example', custom + ':444', custom.replace('https:', 'http:'), 'https://other.amplifyapp.com']) {
    assert.equal(isAllowedTelehealthOrigin(request(origin, origin === 'null' ? custom : origin, {
      'x-forwarded-host': new URL(custom).host, 'x-forwarded-proto': 'https',
    })), false);
  }
});

test('local same-origin development is allowed only outside production', () => {
  const local = request('http://localhost:3000');
  assert.equal(isAllowedTelehealthOrigin(local), false);
  assert.equal(isAllowedTelehealthOrigin(local, false), true);
  assert.equal(isAllowedTelehealthOrigin(request('https://untrusted.example'), false), false);
});

test('non-browser requests still proceed to route authentication', () => {
  assert.equal(isAllowedTelehealthOrigin(request()), true);
});
