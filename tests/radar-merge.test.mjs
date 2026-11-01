import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeOpportunities } from '../backend/merge.mjs';
import { balancedUrls, confirmedDeadline } from '../backend/radar-quality.mjs';
import { validate } from '../backend/server.mjs';
import { loadRadar } from '../bot/radar-data.mjs';

const item = (url, deadline = '2026-12-01', extra = {}) => ({
  url, title: 'AI Challenge', type: 'HACKATHON', organization: 'Organizer',
  deadline, deadlineEvidence: deadline ? 'Apply by December 1, 2026' : null, ...extra,
});

test('removes expired and undated listings, including old undated records', () => {
  const old = [item('https://example.org/old', '2026-10-01'),
    item('https://example.org/undated', null), item('https://example.org/live', '2026-12-01', { title: 'Live Challenge' })];
  const merged = mergeOpportunities(old, [item('https://example.org/new', '2026-12-01', { title: 'New Challenge' })], '2026-10-21');
  assert.deepEqual(merged.map((x) => x.url), ['https://example.org/live', 'https://example.org/new']);
});

test('empty scan keeps future previous items and prunes expired ones', () => {
  const previous = [item('https://example.org/future', '2026-12-01'), item('https://example.org/expired', '2026-10-01')];
  const merged = mergeOpportunities(previous, [], '2026-10-21');
  assert.deepEqual(merged.map((x) => x.url), ['https://example.org/future']);
});

test('rejects unknown organization and directory pages', () => {
  const merged = mergeOpportunities([], [item('https://devpost.com/c/artificial-intelligence'),
    item('https://example.org/hackathon', '2026-12-01', { organization: 'Unknown' }),
    item('https://example.org/real-hackathon')], '2026-10-21');
  assert.deepEqual(merged.map((x) => x.url), ['https://example.org/real-hackathon']);
});

test('requires a real deadline explicitly supported by a quote on the same page', () => {
  const page = 'Registration closes on October 30, 2026 for AI Challenge.';
  assert.equal(confirmedDeadline('2026-10-30', 'Registration closes on October 30, 2026', page, '2026-10-21'), true);
  assert.equal(confirmedDeadline('2026-10-29', 'Registration closes on October 30, 2026', page, '2026-10-21'), false);
  assert.equal(confirmedDeadline('2026-10-30', 'Registration closes on October 30, 2026', page, '2026-10-31'), false);
  assert.equal(confirmedDeadline('2026-02-30', 'Registration closes on February 30, 2026', page, '2026-01-01'), false);
});

test('scanner refuses undated, unknown, and non-event sources', () => {
  const source = 'AI Challenge. Registration closes on October 30, 2026.';
  const candidates = [
    item('https://example.org/challenge', '2026-10-30'),
    item('https://example.org/challenge', '2026-10-30', { organization: 'Unknown' }),
    item('https://example.org/challenge', null),
    item('https://example.org/challenge', '2026-10-29'),
    item('https://devpost.com/c/artificial-intelligence', '2026-10-30'),
  ].map((entry) => ({ ...entry, deadline_quote: 'Registration closes on October 30, 2026' }));
  const sources = new Map([['https://example.org/challenge', source], ['https://devpost.com/c/artificial-intelligence', source]]);
  const accepted = validate(candidates, sources, '2026-10-21');
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].deadline, '2026-10-30');
});

test('stable distinct ids and soonest deadline first', () => {
  const merged = mergeOpportunities([], [item('https://www.a.org/x'),
    item('https://www.b.org/y', '2026-11-05', { deadlineEvidence: 'Apply by November 5, 2026' })], '2026-10-21');
  assert.deepEqual(merged.map((x) => x.url), ['https://www.b.org/y', 'https://www.a.org/x']);
  assert.equal(new Set(merged.map((x) => x.id)).size, 2);
});

test('bot does not show incomplete or expired feed records', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => [
    item('https://example.org/past', '2020-01-01'),
    item('https://example.org/undated', null),
    item('https://example.org/unknown', '2099-12-01', { organization: 'Unknown' }),
    item('https://example.org/current', '2099-12-01', { deadlineEvidence: 'Apply by December 1, 2099' }),
  ] });
  t.after(() => { globalThis.fetch = originalFetch; });
  assert.deepEqual((await loadRadar()).map((entry) => entry.url), ['https://example.org/current']);
});

test('keeps one entry when the same program is listed under two URLs', () => {
  const official = item('https://example.org/fellowship', '2026-12-01', { title: 'Fellowship', summary: 'Funds PhD research.', firstSeen: '2026-10-21' });
  const news = item('https://news.example.org/fellowship-open', '2026-12-01', { title: 'Fellowship', summary: '' });
  const other = item('https://example.org/fellowship-2', '2027-03-01', { title: 'Fellowship' });
  const merged = mergeOpportunities([official], [news, other], '2026-10-29');
  assert.deepEqual(merged.map((x) => x.url), ['https://example.org/fellowship', 'https://example.org/fellowship-2']);
});

test('balancedUrls takes one result from each query in turn and skips duplicates and non-http links', () => {
  const lists = [
    ['https://a.example/1', 'https://a.example/2', 'https://a.example/3'],
    ['https://b.example/1', 'https://a.example/1', 'ftp://bad.example/x'],
    ['https://c.example/1'],
  ];
  assert.deepEqual(balancedUrls(lists, 5), [
    'https://a.example/1', 'https://b.example/1', 'https://c.example/1', 'https://a.example/2', 'https://a.example/3',
  ]);
  // The budget cuts the last queries last, not the first ones.
  assert.deepEqual(balancedUrls(lists, 2), ['https://a.example/1', 'https://b.example/1']);
  assert.deepEqual(balancedUrls([], 5), []);
});
