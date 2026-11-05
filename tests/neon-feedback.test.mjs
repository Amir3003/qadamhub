import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/beta-feedback.js';

test('Neon feedback is parameterized and never falls back to Supabase', async () => {
  const saved = { ...process.env };
  const originalFetch = globalThis.fetch;
  const calls = [];
  let accepted = true;
  process.env.VITE_NEON_URL = 'https://example.neon.tech/neondb';
  process.env.NEON_DATABASE_URL = 'postgresql://test:secret@example.neon.tech/neondb?sslmode=require';
  process.env.FORMS_IP_HASH_SECRET = 'a'.repeat(32);
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ fields: [{name:'accepted',dataTypeID:16}], rows: [[accepted ? 't' : 'f']], rowCount: 1, rowAsArray: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const result = { headers: {} };
  const response = { setHeader: (k, v) => { result.headers[k] = v; }, status: n => { result.status = n; return response; }, json: x => { result.body = x; } };
  try {
    await handler({ method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': 'test-neon' }, body: { type: 'bug', description: 'A test report with enough text.' } }, response);
    assert.equal(result.status, 200);
    assert.equal(calls.length, 1);
    assert.match(calls[0].body.query, /qadam_private\.submit_feedback/i);
    assert.match(calls[0].body.params[0], /^[a-f0-9]{64}$/);
    assert.match(calls[0].body.params[1], /A test report with enough text/);
    assert.ok(!JSON.stringify(calls[0].body).includes('test-neon'));
    accepted = false;
    await handler({ method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': 'test-neon-limited' }, body: { type: 'bug', description: 'A test report with enough text.' } }, response);
    assert.equal(result.status, 429);
    delete process.env.FORMS_IP_HASH_SECRET;
    await handler({ method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': 'test-neon-secret' }, body: { type: 'bug', description: 'A test report with enough text.' } }, response);
    assert.equal(result.status, 503);
    delete process.env.NEON_DATABASE_URL;
    await handler({ method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': 'test-neon-missing' }, body: { type: 'bug', description: 'A test report with enough text.' } }, response);
    assert.equal(result.status, 503);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    process.env = saved;
  }
});
