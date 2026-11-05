import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/public-form.js';

function call(body, extra = {}) {
  const result = {};
  const response = { setHeader() {}, status(n) { result.status = n; return this; }, json(data) { result.body = data; } };
  return handler({ method: 'POST', headers: { host: 'test.example', origin: 'https://test.example', 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.5', ...extra }, body }, response).then(() => result);
}
const suggestion = { kind: 'suggestion', data: { title: 'Test grant', url: 'https://example.invalid', type: 'grant', deadline: '', note: '' } };

test('public forms validate requests, preserve privacy and enforce database decisions', async () => {
  const saved = { ...process.env };
  const originalFetch = globalThis.fetch;
  let accepted = true;
  let calls = [];
  try {
    process.env.NEON_FORMS_DATABASE_URL = 'postgresql://test:secret@example.neon.tech/neondb?sslmode=require';
    process.env.FORMS_IP_HASH_SECRET = 'test-secret-at-least-32-characters-long';
    globalThis.fetch = async (url, init) => {
      calls.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ fields: [{ name: 'accepted', dataTypeID: 16 }], rows: [[accepted ? 't' : 'f']], rowCount: 1, rowAsArray: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    assert.equal((await call(suggestion, { origin: 'https://evil.example' })).status, 403);
    assert.equal((await call({ ...suggestion, data: { ...suggestion.data, url: 'javascript:alert(1)' } })).status, 422);
    assert.equal((await call({ ...suggestion, website: 'spam' })).status, 200);
    assert.equal(calls.length, 0);
    assert.equal((await call(suggestion)).status, 200);
    assert.equal(calls.length, 1);
    const params = calls[0].params;
    assert.equal(params[0], 'suggestion');
    assert.match(params[1], /^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(calls[0]).includes('192.0.2.5'));
    accepted = false;
    assert.equal((await call(suggestion)).status, 429);
    delete process.env.NEON_FORMS_DATABASE_URL;
    assert.equal((await call(suggestion)).status, 503);
    assert.equal(calls.length, 2);
  } finally {
    process.env = saved;
    globalThis.fetch = originalFetch;
  }
});
