import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, daysBetween, notes } from '../scripts/check-catalog-links.mjs';

test('classify separates open, bot-blocked and broken pages', () => {
  for (const status of [200, 204, 301, 302]) assert.equal(classify(status), 'ok');
  for (const status of [401, 403, 429]) assert.equal(classify(status), 'blocked');
  for (const status of [0, 404, 410, 500, 503]) assert.equal(classify(status), 'broken');
});

test('daysBetween counts whole days', () => {
  assert.equal(daysBetween('2026-11-01', '2026-11-01'), 0);
  assert.equal(daysBetween('2026-01-01', '2026-05-01'), 120);
});

test('notes flag a past deadline and a stale verification date', () => {
  const base = { nextDeadline: null, lastVerified: '2026-11-01' };
  assert.deepEqual(notes(base, '2026-11-30'), []);
  assert.deepEqual(notes({ ...base, nextDeadline: '2026-11-10' }, '2026-11-30'), ['deadline 2026-11-10 has passed, update it']);
  assert.deepEqual(notes(base, '2027-03-15'), ['last verified 134 days ago']);
});
