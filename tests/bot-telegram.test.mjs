import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Runs the real bot against a fake Telegram server and a fake radar. Covers the commands people use:
// /subscribe, tapping Track, /tracking, Untrack and /unsubscribe, and what the bot saves on disk.
const FEED = [{ id: 'scan-aaaaaaaaaaaa', title: 'Test Hackathon', url: 'https://example.org/h', deadline: '2099-12-01', deadlineEvidence: 'Apply by Dec 1, 2099', organization: 'Org', type: 'HACKATHON' }];
const CATALOG = [{ id: 'gks-test', title: 'GKS Test', url: 'https://example.org/gks', type: 'GRANT', organization: 'NIIED', nextDeadline: null, opensMonths: [2] }];

function server(handler) {
  return new Promise((resolve) => {
    const s = http.createServer(handler);
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
}

test('the bot subscribes, tracks, lists, untracks and deletes what it saved', async () => {
  const sent = [];
  const queue = [];
  const radar = await server((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.url.includes('programs') ? CATALOG : FEED));
  });
  const telegram = await server(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const method = req.url.split('/').pop();
    const payload = body ? JSON.parse(body) : {};
    res.setHeader('Content-Type', 'application/json');
    if (method === 'getMe') return res.end(JSON.stringify({ ok: true, result: { first_name: 'Test', username: 'TestBot' } }));
    if (method === 'getUpdates') {
      if (queue.length) return res.end(JSON.stringify({ ok: true, result: queue.splice(0) }));
      return setTimeout(() => res.end(JSON.stringify({ ok: true, result: [] })), 150);
    }
    if (method === 'sendMessage') sent.push(payload);
    return res.end(JSON.stringify({ ok: true, result: {} }));
  });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'qadam-bot-'));
  const stateFile = path.join(dir, 'state.json');
  const bot = spawn(process.execPath, ['bot/index.mjs'], {
    env: {
      ...process.env,
      TELEGRAM_BOT_TOKEN: 'test-token',
      TELEGRAM_API_BASE: `http://127.0.0.1:${telegram.address().port}`,
      RADAR_DATA_URL: `http://127.0.0.1:${radar.address().port}/feed.json`,
      CATALOG_DATA_URL: `http://127.0.0.1:${radar.address().port}/programs.json`,
      BOT_STATE_FILE: stateFile,
    },
    stdio: 'ignore',
  });
  const text = (m) => (m ? `${m.text}` : '');
  const say = (id, message) => queue.push({ update_id: id, message: { chat: { id: 42 }, from: { first_name: 'Aigerim' }, text: message } });
  const tap = (id, data) => queue.push({ update_id: id, callback_query: { id: `cb${id}`, data, from: { first_name: 'Aigerim' }, message: { chat: { id: 42 } } } });
  const waitFor = async (check, label) => {
    for (let i = 0; i < 80; i++) {
      if (check()) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.fail(`timed out: ${label}`);
  };
  try {
    say(1, '/radar');
    await waitFor(() => sent.some((m) => text(m).includes('QADAM Radar')), '/radar');
    const radarMessage = sent.find((m) => text(m).includes('QADAM Radar'));
    assert.match(radarMessage.text, /Test Hackathon/);
    assert.match(radarMessage.text, /GKS Test/); // the catalog follows the dated feed
    const buttons = radarMessage.reply_markup.inline_keyboard.flat().map((b) => b.callback_data).filter(Boolean);
    assert.ok(buttons.includes('track:scan-aaaaaaaaaaaa'));
    assert.ok(buttons.includes('track:catalog-gks-test'));

    say(2, '/subscribe');
    await waitFor(() => sent.some((m) => text(m).includes('You are subscribed')), '/subscribe');
    assert.match(sent.find((m) => text(m).includes('You are subscribed')).text, /09:00 Astana/);

    tap(3, 'track:scan-aaaaaaaaaaaa');
    await waitFor(() => sent.some((m) => text(m).includes('Tracking:')), 'track');
    assert.match(sent.find((m) => text(m).includes('Tracking:')).text, /7, 3 and 1 day before the deadline \(2099-12-01\)/);
    tap(4, 'track:catalog-gks-test');
    await waitFor(() => sent.filter((m) => text(m).includes('Tracking:')).length === 2, 'track catalog');
    assert.match(sent.filter((m) => text(m).includes('Tracking:'))[1].text, /1st of a month/);

    say(5, '/tracking');
    await waitFor(() => sent.some((m) => text(m).includes('Your list')), '/tracking');
    assert.match(sent.find((m) => text(m).includes('Your list')).text, /Test Hackathon[\s\S]*GKS Test/);

    const saved = JSON.parse(await fs.readFile(stateFile, 'utf8'));
    assert.deepEqual(saved.subscribers['42'].tracked, ['scan-aaaaaaaaaaaa', 'catalog-gks-test']);
    assert.equal(saved.subscribers['42'].digest, true);
    assert.deepEqual(Object.keys(saved.subscribers['42']).sort(), ['digest', 'sent', 'since', 'tracked']); // no name, no username

    tap(6, 'untrack:catalog-gks-test');
    await waitFor(() => sent.some((m) => text(m).includes('Removed from your list')), 'untrack');
    say(7, '/unsubscribe');
    await waitFor(() => sent.some((m) => text(m).includes('what I saved about you is deleted')), '/unsubscribe');
    await new Promise((r) => setTimeout(r, 300));
    const after = JSON.parse(await fs.readFile(stateFile, 'utf8'));
    assert.deepEqual(after.subscribers, {});

    say(8, '/privacy');
    await waitFor(() => sent.some((m) => text(m).includes('How QADAM handles your data')), '/privacy');
    assert.match(sent.find((m) => text(m).includes('How QADAM handles your data')).text, /chat id/);
  } finally {
    bot.kill();
    telegram.close();
    radar.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
});
