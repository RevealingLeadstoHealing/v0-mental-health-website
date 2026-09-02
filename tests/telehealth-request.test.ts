import test from 'node:test';
import assert from 'node:assert/strict';
import { telehealthRequest } from '../lib/ehr/telehealth-request.ts';

function mockRequest(responses: Response[]) {
  const calls: Array<{ path: unknown; options: RequestInit | undefined }> = [];
  const request = (async (path, options) => {
    calls.push({ path, options });
    const response = responses.shift();
    assert.ok(response, 'Unexpected extra request');
    return response;
  }) as typeof fetch;
  return { calls, request };
}
test('expired room session refreshes existing EHR cookies and retries the same operation once', async () => {
  const { calls, request } = mockRequest([
    Response.json({ error: 'Missing session' }, { status: 401 }),
    Response.json({ authenticated: true }),
    Response.json({ active: true }),
  ]);
  const body = JSON.stringify({ action: 'start', clientId: 'synthetic', telehealthConsent: true });
  assert.deepEqual(await telehealthRequest('/api/ehr/telehealth', { method: 'POST', body }, request), { active: true });
  assert.deepEqual(calls.map(c => c.path), ['/api/ehr/telehealth', '/api/ehr/auth/refresh', '/api/ehr/telehealth']);
  assert.equal(calls[2].options?.body, body);
  for (const call of calls) assert.equal(call.options?.credentials, 'same-origin');
});
test('missing refresh session stops without retrying a room operation', async () => {
  const { calls, request } = mockRequest([Response.json({}, { status: 401 }), Response.json({}, { status: 401 })]);
  await assert.rejects(telehealthRequest('/api/ehr/telehealth', {}, request), /sign in again/);
  assert.equal(calls.length, 2);
});
test('a second authentication rejection cannot trigger a refresh loop', async () => {
  const { calls, request } = mockRequest([Response.json({}, { status: 401 }), Response.json({}), Response.json({}, { status: 401 })]);
  await assert.rejects(telehealthRequest('/api/ehr/telehealth', {}, request), /sign in again/);
  assert.equal(calls.length, 3);
});
test('room permission, consent and service failures are not retried', async () => {
  for (const status of [403, 409, 503]) {
    const { calls, request } = mockRequest([Response.json({ error: 'Original room error' }, { status })]);
    await assert.rejects(telehealthRequest('/api/ehr/telehealth', { method: 'POST' }, request), /Original room error/);
    assert.equal(calls.length, 1);
  }
});
test('healthy sessions do not refresh', async () => {
  const { calls, request } = mockRequest([Response.json({ configured: true })]);
  assert.deepEqual(await telehealthRequest('/api/ehr/telehealth', {}, request), { configured: true });
  assert.equal(calls.length, 1);
});
