import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyState, normalizeState, subscribeDigest, track, untrack, forget, plan, msUntilNextRun, runDue, daysUntil,
} from '../bot/notify-core.mjs';
import { normalizeFeed, normalizeCatalog } from '../bot/radar-data.mjs';

const item = (id, extra = {}) => ({ id, title: `Program ${id}`, url: `https://example.org/${id}`, type: 'GRANT', organization: 'Org', deadline: null, opensMonths: [], ...extra });
const at = (iso) => Date.parse(iso);
const run = (state, items, iso) => {
  const result = plan(state, items, at(iso));
  result.commit(state, result.messages);
  return result.messages;
};

test('the first run only remembers what exists and announces nothing', () => {
  const state = emptyState();
  subscribeDigest(state, 1, '2026-11-01T00:00:00Z');
  assert.deepEqual(run(state, [item('a'), item('b')], '2026-11-02T04:00:00Z'), []);
  assert.deepEqual(state.seen.sort(), ['a', 'b']);
  assert.equal(state.lastRun, '2026-11-02');
});

test('the digest lists only new items, only for people who subscribed, and only once', () => {
  const state = emptyState();
  subscribeDigest(state, 1, '2026-11-01T00:00:00Z');
  track(state, 2, item('a'), '2026-11-01', '2026-11-01T00:00:00Z'); // tracks only, no digest
  run(state, [item('a')], '2026-11-02T04:00:00Z');
  const messages = run(state, [item('a'), item('b', { deadline: '2026-12-01' })], '2026-11-03T04:00:00Z');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].chatId, '1');
  assert.match(messages[0].text, /Program b/);
  assert.doesNotMatch(messages[0].text, /Program a/);
  assert.match(messages[0].text, /Deadline: 2026-12-01/);
  assert.deepEqual(run(state, [item('a'), item('b')], '2026-11-04T04:00:00Z'), []);
});

test('a long digest shows five items and says how many more', () => {
  const state = emptyState();
  subscribeDigest(state, 1, '2026-11-01T00:00:00Z');
  run(state, [], '2026-11-02T04:00:00Z');
  const many = Array.from({ length: 8 }, (_, i) => item(`n${i}`));
  const [message] = run(state, many, '2026-11-03T04:00:00Z');
  assert.equal(message.items.length, 5);
  assert.match(message.text, /\+3 more/);
});

test('reminders come at 7, 3 and 1 day, each once', () => {
  const state = emptyState();
  const grant = item('g', { deadline: '2026-12-10' });
  track(state, 5, grant, '2026-11-01', '2026-11-01T00:00:00Z');
  assert.deepEqual(run(state, [grant], '2026-12-02T04:00:00Z'), []); // 8 days left
  const seven = run(state, [grant], '2026-12-03T04:00:00Z');
  assert.equal(seven.length, 1);
  assert.match(seven[0].text, /Deadline in 7 days/);
  assert.deepEqual(run(state, [grant], '2026-12-03T05:00:00Z'), []); // same day again
  assert.match(run(state, [grant], '2026-12-07T04:00:00Z')[0].text, /Deadline in 3 days/);
  assert.match(run(state, [grant], '2026-12-09T04:00:00Z')[0].text, /Deadline tomorrow/);
  assert.deepEqual(run(state, [grant], '2026-12-10T04:00:00Z'), []); // nothing left to say
});

test('after the bot was down, one reminder covers the missed windows', () => {
  const state = emptyState();
  const grant = item('g', { deadline: '2026-12-10' });
  track(state, 5, grant, '2026-11-01', '2026-11-01T00:00:00Z');
  const messages = run(state, [grant], '2026-12-08T04:00:00Z'); // 2 days left, 7 and 3 both missed
  assert.equal(messages.length, 1);
  assert.match(messages[0].text, /Deadline in 2 days/);
  assert.deepEqual(run(state, [grant], '2026-12-09T04:00:00Z').map((m) => m.text.includes('tomorrow')), [true]);
});

test('tracking a listing already inside a window does not fire the reminders behind it', () => {
  const state = emptyState();
  const grant = item('g', { deadline: '2026-12-05' });
  track(state, 5, grant, '2026-12-03', '2026-12-03T10:00:00Z'); // 2 days left: the 7 and 3 day reminders are behind it
  assert.deepEqual(run(state, [grant], '2026-12-03T12:00:00Z'), []);
  const [message] = run(state, [grant], '2026-12-04T04:00:00Z');
  assert.match(message.text, /Deadline tomorrow/);
});

test('a yearly program that usually opens this month is announced once, on the 1st', () => {
  const state = emptyState();
  const program = item('gks', { opensMonths: [2, 9] });
  track(state, 7, program, '2026-01-10', '2026-01-10T00:00:00Z');
  assert.deepEqual(run(state, [program], '2026-02-02T04:00:00Z'), []); // not the 1st
  const [message] = run(state, [program], '2026-02-01T04:00:00Z');
  assert.match(message.text, /Usually opens this month: February/);
  assert.match(message.text, /not a confirmed date/);
  assert.deepEqual(run(state, [program], '2026-02-01T05:00:00Z'), []);
  assert.deepEqual(run(state, [program], '2026-03-01T04:00:00Z'), []); // March is not an opening month
});

test('a tracked listing that left the radar is skipped without an error', () => {
  const state = emptyState();
  track(state, 5, item('gone', { deadline: '2026-12-05' }), '2026-11-01', '2026-11-01T00:00:00Z');
  assert.deepEqual(run(state, [], '2026-12-02T04:00:00Z'), []);
});

test('untracking the last thing and unsubscribing remove the chat completely', () => {
  const state = emptyState();
  track(state, 5, item('a'), '2026-11-01', '2026-11-01T00:00:00Z');
  untrack(state, 5, 'a');
  assert.deepEqual(state.subscribers, {});
  subscribeDigest(state, 6, '2026-11-01T00:00:00Z');
  track(state, 6, item('a'), '2026-11-01', '2026-11-01T00:00:00Z');
  untrack(state, 6, 'a');
  assert.equal(state.subscribers['6'].digest, true); // still subscribed to the digest
  forget(state, 6);
  assert.deepEqual(state.subscribers, {});
});

test('a person can track at most 30 listings', () => {
  const state = emptyState();
  for (let i = 0; i < 30; i++) assert.equal(track(state, 1, item(`t${i}`), '2026-11-01', '2026-11-01T00:00:00Z').ok, true);
  assert.deepEqual(track(state, 1, item('t30'), '2026-11-01', '2026-11-01T00:00:00Z'), { ok: false, reason: 'limit' });
});

test('titles are escaped for Telegram HTML', () => {
  const state = emptyState();
  const grant = item('g', { title: 'A <b>&</b> B', deadline: '2026-12-10' });
  track(state, 5, grant, '2026-11-01', '2026-11-01T00:00:00Z');
  const [message] = run(state, [grant], '2026-12-03T04:00:00Z');
  assert.match(message.text, /A &lt;b&gt;&amp;&lt;\/b&gt; B/);
});

test('the daily run is 09:00 in Astana (04:00 UTC), and runs once a day, also after a restart', () => {
  assert.equal(msUntilNextRun(at('2026-11-01T03:00:00Z')), 3_600_000);
  assert.equal(msUntilNextRun(at('2026-11-01T04:00:00Z')), 86_400_000);
  assert.equal(msUntilNextRun(at('2026-11-01T10:00:00Z')), 18 * 3_600_000);
  const state = emptyState();
  assert.equal(runDue(state, at('2026-11-01T03:59:00Z')), false);
  assert.equal(runDue(state, at('2026-11-01T04:00:00Z')), true);
  assert.equal(runDue(state, at('2026-11-01T18:00:00Z')), true); // restarted later in the day
  state.lastRun = '2026-11-01';
  assert.equal(runDue(state, at('2026-11-01T18:00:00Z')), false);
  assert.equal(runDue(state, at('2026-11-02T04:00:00Z')), true);
});

test('saved state is cleaned when it is read back', () => {
  const state = normalizeState({
    seen: ['a', 5], lastRun: '2026-11-01',
    subscribers: { '12': { digest: true, tracked: ['x', 3], sent: { 'x|7': '2026-11-01' } }, 'bad id': { digest: true } },
  });
  assert.deepEqual(Object.keys(state.subscribers), ['12']);
  assert.deepEqual(state.subscribers['12'].tracked, ['x']);
  assert.deepEqual(state.seen, ['a']);
  assert.deepEqual(normalizeState('junk'), emptyState());
  assert.equal(daysUntil(null, '2026-11-01'), null);
});

test('radar data: the feed keeps dated listings, the catalog keeps verified programs and their opening months', () => {
  const feed = normalizeFeed([
    { id: 'scan-1', title: 'Live', url: 'https://a.example/1', deadline: '2026-12-01', deadlineEvidence: 'Apply by Dec 1', organization: 'Org', type: 'GRANT' },
    { id: 'scan-2', title: 'Old', url: 'https://a.example/2', deadline: '2026-10-01', deadlineEvidence: 'x', organization: 'Org', type: 'GRANT' },
    { id: 'scan-3', title: 'No evidence', url: 'https://a.example/3', deadline: '2026-12-01', organization: 'Org', type: 'GRANT' },
  ], '2026-11-01');
  assert.deepEqual(feed.map((x) => x.id), ['scan-1']);
  const catalog = normalizeCatalog([
    { id: 'gks', title: 'GKS', url: 'https://b.example/gks', type: 'GRANT', organization: 'NIIED', nextDeadline: null, opensMonths: [2, 13, 'x'] },
    { id: 'dated', title: 'Dated', url: 'https://b.example/d', type: 'GRANT', organization: 'X', nextDeadline: '2026-12-08' },
    { id: 'past', title: 'Past', url: 'https://b.example/p', type: 'GRANT', organization: 'X', nextDeadline: '2026-01-01' },
    { id: 'http', title: 'Insecure', url: 'http://b.example/h', type: 'GRANT', organization: 'X' },
  ], '2026-11-01');
  assert.deepEqual(catalog.map((x) => [x.id, x.deadline, x.opensMonths]), [['catalog-gks', null, [2]], ['catalog-dated', '2026-12-08', []], ['catalog-past', null, []]]);
});
