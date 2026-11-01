import fs from 'node:fs/promises';
import path from 'node:path';
import { loadAllItems, loadRadar } from './radar-data.mjs';
import {
  daysUntil, describe, emptyState, forget, normalizeState, plan, runDue, subscribeDigest, track, untrack,
} from './notify-core.mjs';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('Missing TELEGRAM_BOT_TOKEN in .env'); process.exit(1); }
const BOT_USERNAME = process.env.BOT_USERNAME || 'QadamAgentBot';
const FALLBACK_PUBLIC_WEB_APP_URL = 'https://www.qadamhub.com';
const AVATAR_FILE = 'public/brand/qadam-avatar.png';
const OFFICIAL_SLOGAN = 'QADAM means "step". Your next step toward global opportunities, grants, and technologies.';
const BRAND_FOOTER = 'QADAM · www.qadamhub.com';

// Helper: Ensure all Telegram inline keyboard buttons strictly receive a valid public HTTPS URL
function getWebUrl(subpath = '') {
  let base = process.env.WEB_APP_URL || FALLBACK_PUBLIC_WEB_APP_URL;
  if (!base || base.includes('localhost') || base.includes('127.0.0.1')) {
    base = FALLBACK_PUBLIC_WEB_APP_URL;
  }
  base = base.replace(/\/+$/, '');
  const cleanSubpath = subpath ? (subpath.startsWith('/') ? subpath : `/${subpath}`) : '';
  return `${base}${cleanSubpath}`;
}

// TELEGRAM_API_BASE exists so the tests can point the bot at a local fake server.
const BASE_URL = `${process.env.TELEGRAM_API_BASE || 'https://api.telegram.org'}/bot${TOKEN}`;

// In-memory student link registry (Chat ID -> Student Data), cleared on restart
const studentRegistry = new Map();

// What the bot keeps on disk, only for people who sent /subscribe or tapped Track: their chat id,
// the ids of the listings they track and which reminders were already sent. /unsubscribe deletes it.
// Under systemd the folder is StateDirectory; elsewhere it is bot/data (ignored by git).
const STATE_FILE = process.env.BOT_STATE_FILE
  || (process.env.STATE_DIRECTORY
    ? path.join(process.env.STATE_DIRECTORY.split(':')[0], 'telegram-state.json')
    : 'bot/data/telegram-state.json');

let state = emptyState();

async function loadState() {
  try {
    // STATE_FILE comes from the service configuration, never from a chat message.
    state = normalizeState(JSON.parse(await fs.readFile(STATE_FILE, 'utf8'))); // nosemgrep: javascript.lang.security.audit.detect-non-literal-fs-filename.detect-non-literal-fs-filename
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[State] Could not read the saved state, starting empty:', error.message);
    state = emptyState();
  }
}

async function saveState() {
  try {
    await fs.mkdir(path.dirname(STATE_FILE), { recursive: true }); // nosemgrep: javascript.lang.security.audit.detect-non-literal-fs-filename.detect-non-literal-fs-filename
    const temp = `${STATE_FILE}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(state), { mode: 0o600 }); // nosemgrep: javascript.lang.security.audit.detect-non-literal-fs-filename.detect-non-literal-fs-filename
    await fs.rename(temp, STATE_FILE); // nosemgrep: javascript.lang.security.audit.detect-non-literal-fs-filename.detect-non-literal-fs-filename
  } catch (error) {
    console.error('[State] Could not save the state:', error.message);
  }
}

// Helper: Make Telegram API requests
async function callApi(method, payload = {}) {
  const url = `${BASE_URL}/${method}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('[Telegram API Error] %s:', method, data.description);
    }
    return data;
  } catch (err) {
    console.error('[Network Error] %s:', method, err.message);
    return { ok: false, error: err.message };
  }
}

// Helper: Send HTML formatted message
async function sendMessage(chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  return callApi('sendMessage', payload);
}

// Helper: Answer callback query
async function answerCallback(callbackQueryId, text = null, showAlert = false) {
  return callApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

// Content Renderers
// Telegram parse_mode HTML only needs &, < and > escaped; values never go into attributes.
function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); // nosemgrep: javascript.audit.detect-replaceall-sanitization.detect-replaceall-sanitization
}

async function loadRadarSafe() {
  try {
    return await loadRadar();
  } catch (error) {
    console.error('[Radar Feed Error]', error.message);
    return [];
  }
}

function renderMainMenu(userName = 'Student') {
  return {
    text: `<b>QADAM | AI Opportunity Hub</b>
<i>${escapeHtml(OFFICIAL_SLOGAN)}</i>

Hello, <b>${escapeHtml(userName)}</b>.

Here you can browse current hackathons, grants, and internships from the QADAM radar and get an application draft for any of them. CV analysis and skill verification run on the website, where your profile stays in your browser.

<code>${BRAND_FOOTER}</code>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Opportunity Radar', callback_data: 'radar' },
          { text: 'CV Gap Analysis', callback_data: 'gaps' },
        ],
        [
          { text: 'Privacy', callback_data: 'privacy' },
          { text: 'Application Draft', callback_data: 'draft_1' },
        ],
        [
          { text: 'Open QADAM Website', url: getWebUrl() },
        ],
      ],
    },
  };
}

async function renderRadar() {
  const items = await loadRadarSafe();
  const text = items.length
    ? `<b>QADAM Radar</b>\n\n${items.map((opp, index) =>
      `${index + 1}. <b>${escapeHtml(opp.title)}</b>\n${escapeHtml(opp.type)}${opp.organization ? ` · ${escapeHtml(opp.organization)}` : ''} · Deadline: ${escapeHtml(opp.deadline || 'see official page')}`
    ).join('\n\n')}\n\nCheck each source before applying.`
    : 'No current radar results are available. Please check the website and try again later.';
  const keyboard = items.map((opp, index) => [
    { text: `Source ${index + 1}`, url: opp.url },
    { text: `Draft ${index + 1}`, callback_data: `draft_${index + 1}` },
    ...(trackData(opp.id) ? [{ text: `Track ${index + 1}`, callback_data: trackData(opp.id) }] : []),
  ]);
  keyboard.push([{ text: 'Open QADAM Website', url: getWebUrl('/') }]);
  return { text, reply_markup: { inline_keyboard: keyboard } };
}

// Telegram allows 64 bytes of callback data.
function trackData(id) {
  const data = `track:${id}`;
  return Buffer.byteLength(data) <= 64 ? data : null;
}

function renderGaps() {
  return {
    text: `<b>CV Gap Analysis</b>

The bot does not store your CV, so it cannot score it here. On the QADAM website, CV & Skill Lab compares your skills with a target opportunity you pick and shows:

• an ATS health score for your profile
• which required skills you already have
• which skills are missing or not yet verified
• short quizzes to verify a skill

<i>${BRAND_FOOTER}</i>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Open CV & Skill Lab', url: getWebUrl('/cv') },
        ],
        [
          { text: 'Opportunity Radar', callback_data: 'radar' },
          { text: 'Main Menu', callback_data: 'menu' },
        ],
      ],
    },
  };
}

function renderPrivacy() {
  return {
    text: `<b>How QADAM handles your data</b>

1. <b>Profile stays in your browser.</b>
Your profile and CV on the website are saved in your browser's local storage.

2. <b>Masking before AI requests.</b>
Before text is sent to an AI model, names, email addresses, and phone numbers are replaced with placeholders such as <code>[USER_NAME_1]</code> and <code>[EMAIL_MASKED]</code>.

3. <b>What this bot keeps.</b>
By default only your Telegram display name, in memory while the bot runs. If you send /subscribe or tap Track, the bot also saves your Telegram chat id and the listings you track on its server, to send you the messages you asked for. /unsubscribe deletes all of it. The bot never asks for your CV.

<i>${BRAND_FOOTER}</i>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Opportunity Radar', callback_data: 'radar' },
          { text: 'Main Menu', callback_data: 'menu' },
        ],
      ],
    },
  };
}

async function renderDraft(index) {
  const items = await loadRadarSafe();
  const opp = items[index - 1] || items[0];

  if (!opp) {
    return {
      text: 'No radar opportunities are available right now, so there is nothing to draft. Please try again later.',
      reply_markup: { inline_keyboard: [[{ text: 'Main Menu', callback_data: 'menu' }]] },
    };
  }

  const title = escapeHtml(opp.title);
  const text = `<b>Application Draft: ${title}</b>
${escapeHtml(opp.type)}${opp.organization ? ` · ${escapeHtml(opp.organization)}` : ''} · Deadline: ${escapeHtml(opp.deadline || 'see official page')}

<i>Template with placeholders. Replace the [brackets] with your own details, or open Application Studio on the website to fill it from your profile.</i>

<b>Summary of Intent</b>
I am applying for ${title}. I am a [year] student in [major] at [university], and my work focuses on [your focus area].

<b>Relevant Experience</b>
1. [Project or role]: [what you built and the measurable result].
2. [Skills]: [tools and methods that match the requirements in the source].
3. [Why this opportunity]: [how it fits your goals].

<b>Proposed Contribution</b>
[What you plan to deliver or learn, in two or three sentences.]

Check the eligibility and requirements in the source before applying.

<i>${BRAND_FOOTER}</i>`;

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Open Source', url: opp.url },
          { text: 'Application Studio', url: getWebUrl('/application-studio') },
        ],
        [
          { text: 'Opportunity Radar', callback_data: 'radar' },
          { text: 'Main Menu', callback_data: 'menu' },
        ],
      ],
    },
  };
}

function renderHelp() {
  return {
    text: `<b>QADAM Bot Commands</b>

/start - Open the main menu
/radar - Current opportunities from the QADAM radar
/draft - Application draft for the top radar opportunity
/subscribe - Daily message at 09:00 Astana time with what is new on the radar
/tracking - The listings you track (tap Track under a listing in /radar)
/unsubscribe - Stop all messages and delete what the bot saved about you
/gaps - How CV gap analysis works
/privacy - How QADAM handles your data
/help - Show this list

<i>${BRAND_FOOTER}</i>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Opportunity Radar', callback_data: 'radar' },
          { text: 'CV Gap Analysis', callback_data: 'gaps' },
        ],
        [
          { text: 'Open QADAM Website', url: getWebUrl() },
        ],
      ],
    },
  };
}

const todayUtc = () => new Date().toISOString().slice(0, 10);
const menuRow = [{ text: 'Opportunity Radar', callback_data: 'radar' }, { text: 'Main Menu', callback_data: 'menu' }];

async function doSubscribe(chatId) {
  subscribeDigest(state, chatId, new Date().toISOString());
  await saveState();
  return {
    text: `<b>You are subscribed.</b>

Once a day at 09:00 Astana time I write only if something new appeared on the radar. Tap Track under a listing to also get a reminder 7, 3 and 1 day before its deadline.

/unsubscribe stops everything and deletes what I saved about you.`,
    reply_markup: { inline_keyboard: [menuRow] },
  };
}

async function doUnsubscribe(chatId) {
  forget(state, chatId);
  await saveState();
  return {
    text: 'Done. I will not write to you first any more, and what I saved about you is deleted. You can still use /radar and /draft.',
    reply_markup: { inline_keyboard: [menuRow] },
  };
}

async function doTrack(chatId, id) {
  let items;
  try {
    items = await loadAllItems();
  } catch (error) {
    console.error('[Radar Feed Error]', error.message);
    return { text: 'The radar is not available right now. Please try again later.', reply_markup: { inline_keyboard: [menuRow] } };
  }
  const item = items.find((candidate) => candidate.id === id);
  if (!item) return { text: 'That listing is no longer on the radar.', reply_markup: { inline_keyboard: [menuRow] } };
  const result = track(state, chatId, item, todayUtc(), new Date().toISOString());
  if (!result.ok) {
    return { text: 'You can track up to 30 listings. Remove one with the Untrack button in /tracking first.', reply_markup: { inline_keyboard: [menuRow] } };
  }
  await saveState();
  const when = item.deadline
    ? `I will message you 7, 3 and 1 day before the deadline (${escapeHtml(item.deadline)}).`
    : item.opensMonths.length
      ? 'It has no fixed deadline on the radar. I will tell you on the 1st of a month when it usually opens, and when a deadline appears.'
      : 'It has no confirmed date yet. I will write when a deadline appears on the radar.';
  return {
    text: `<b>Tracking:</b> ${escapeHtml(item.title)}\n\n${when}\n\n/tracking shows your list. /unsubscribe deletes it.`,
    reply_markup: { inline_keyboard: [[{ text: 'Untrack', callback_data: `untrack:${id}` }, ...menuRow]] },
  };
}

async function doUntrack(chatId, id) {
  untrack(state, chatId, id);
  await saveState();
  return { text: 'Removed from your list.', reply_markup: { inline_keyboard: [[{ text: 'My list', callback_data: 'tracking' }, ...menuRow]] } };
}

async function renderTracking(chatId) {
  const sub = state.subscribers[String(chatId)];
  if (!sub || sub.tracked.length === 0) {
    return {
      text: 'You are not tracking anything yet. Open /radar and tap Track under a listing.',
      reply_markup: { inline_keyboard: [menuRow] },
    };
  }
  let items = [];
  try {
    items = await loadAllItems();
  } catch (error) {
    console.error('[Radar Feed Error]', error.message);
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  const lines = sub.tracked.map((id, index) => {
    const item = byId.get(id);
    if (!item) return `${index + 1}. Not on the radar any more`;
    const days = daysUntil(item.deadline, todayUtc());
    return `${index + 1}. <b>${escapeHtml(item.title)}</b>\n${escapeHtml(describe(item))}${days !== null && days >= 0 ? ` (${days} days left)` : ''}`;
  });
  const keyboard = sub.tracked.map((id, index) => [
    ...(byId.get(id) ? [{ text: `Source ${index + 1}`, url: byId.get(id).url }] : []),
    { text: `Untrack ${index + 1}`, callback_data: `untrack:${id}` },
  ]);
  keyboard.push(menuRow);
  return { text: `<b>Your list</b>\n\n${lines.join('\n\n')}`, reply_markup: { inline_keyboard: keyboard } };
}

// The daily run at 09:00 Astana time (04:00 UTC). A check every minute also catches up after a restart
// and retries when the radar was unreachable; `lastRun` keeps it to once a day.
let running = false;
async function dailyRun() {
  if (running || !runDue(state, Date.now())) return;
  running = true;
  try {
    let items;
    try {
      items = await loadAllItems();
    } catch (error) {
      console.error('[Daily Run] Radar not available, will retry:', error.message);
      return;
    }
    const { messages, commit } = plan(state, items, Date.now());
    const sent = [];
    for (const message of messages) {
      const keyboard = message.items.map((item, index) => [
        { text: message.kind === 'digest' ? `Source ${index + 1}` : 'Source', url: item.url },
        message.kind === 'digest'
          ? (trackData(item.id) ? { text: `Track ${index + 1}`, callback_data: trackData(item.id) } : null)
          : { text: 'Untrack', callback_data: `untrack:${item.id}` },
      ].filter(Boolean));
      const result = await sendMessage(message.chatId, message.text, { inline_keyboard: keyboard });
      if (result.ok) {
        sent.push(message);
      } else if (result.error_code === 403 || /chat not found/i.test(result.description || '')) {
        // The person blocked the bot or deleted the chat: forget them.
        forget(state, message.chatId);
      }
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    commit(state, sent);
    await saveState();
    console.log(`[Daily Run] ${messages.length} messages planned, ${sent.length} sent.`);
  } catch (error) {
    console.error('[Daily Run Error]', error.message);
  } finally {
    running = false;
  }
}

// Command & Message Router
async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  if (!chatId) return;

  const text = (msg.text || '').trim();
  const command = text.split(/\s+/)[0].split('@')[0].toLowerCase();
  const from = msg.from || {};
  const defaultName = from.first_name
    ? `${from.first_name} ${from.last_name || ''}`.trim()
    : 'Student';

  // 1. /start command with deep-link account binding (e.g., /start connect_amir)
  if (command === '/start') {
    const parts = text.split(' ');
    let linkedName = defaultName;
    if (parts.length > 1 && parts[1].startsWith('connect_')) {
      let paramName = parts[1].replace('connect_', '');
      try {
        paramName = decodeURIComponent(paramName);
      } catch {
        // Keep the raw value when the deep-link payload is not valid percent-encoding
      }
      paramName = paramName.trim().slice(0, 64);
      if (paramName && paramName !== 'qadam') {
        linkedName = paramName.charAt(0).toUpperCase() + paramName.slice(1);
      }
    }

    studentRegistry.set(chatId, {
      name: linkedName,
      username: from.username ? `@${from.username}` : null,
      linkedAt: new Date().toISOString(),
    });

    console.log(`[Account Linked] Chat ${chatId} bound to candidate: "${linkedName}"`);

    const view = renderMainMenu(linkedName);
    return sendMessage(chatId, view.text, view.reply_markup);
  }

  // Retrieve current student profile
  const user = studentRegistry.get(chatId) || { name: defaultName };

  let view;
  if (command === '/radar') view = await renderRadar();
  else if (command === '/draft') view = await renderDraft(1);
  else if (command === '/gaps') view = renderGaps();
  else if (command === '/privacy') view = renderPrivacy();
  else if (command === '/help') view = renderHelp();
  else if (command === '/subscribe') view = await doSubscribe(chatId);
  else if (command === '/unsubscribe') view = await doUnsubscribe(chatId);
  else if (command === '/tracking') view = await renderTracking(chatId);

  if (view) {
    return sendMessage(chatId, view.text, view.reply_markup);
  }

  // Default Fallback: Prompt user with menu
  const fallbackView = renderMainMenu(user.name);
  return sendMessage(
    chatId,
    `Hello, ${escapeHtml(user.name)}. I only understand commands and the buttons below. Send /help to see the full list.`,
    fallbackView.reply_markup
  );
}

// Callback Query Router (Inline button clicks)
async function handleCallbackQuery(cb) {
  const cbId = cb.id;
  const chatId = cb.message?.chat?.id;
  const data = cb.data || '';

  if (!chatId) return;

  const user = studentRegistry.get(chatId) || {
    name: cb.from?.first_name || 'Student',
  };

  // Acknowledge the callback immediately to remove loading spinner in Telegram client
  await answerCallback(cbId);

  let view;
  if (data === 'menu') view = renderMainMenu(user.name);
  else if (data === 'radar') view = await renderRadar();
  else if (data === 'gaps') view = renderGaps();
  else if (data === 'privacy') view = renderPrivacy();
  else if (data === 'tracking') view = await renderTracking(chatId);
  else if (data.startsWith('draft_')) view = await renderDraft(Number(data.slice(6)) || 1);
  else if (data.startsWith('track:')) view = await doTrack(chatId, data.slice(6));
  else if (data.startsWith('untrack:')) view = await doUntrack(chatId, data.slice(8));

  if (view) {
    return sendMessage(chatId, view.text, view.reply_markup);
  }
}

// Register official Bot commands with Telegram
async function registerBotCommands() {
  const commands = [
    { command: 'start', description: 'Open the main menu' },
    { command: 'radar', description: 'Current opportunities from the QADAM radar' },
    { command: 'draft', description: 'Application draft for the top opportunity' },
    { command: 'subscribe', description: 'Daily message with what is new on the radar' },
    { command: 'tracking', description: 'The listings you track' },
    { command: 'unsubscribe', description: 'Stop messages and delete what the bot saved' },
    { command: 'gaps', description: 'How CV gap analysis works' },
    { command: 'privacy', description: 'How QADAM handles your data' },
    { command: 'help', description: 'Show all commands' },
  ];

  const res = await callApi('setMyCommands', { commands });
  if (res.ok) {
    console.log('Telegram bot commands registered.');
  }
}

// Main Long Polling Loop
async function startPolling() {
  console.log(`\n======================================================`);
  console.log(`QADAM | AI Opportunity Hub: Telegram Bot (@${BOT_USERNAME}) starting`);
  console.log(`Endpoint: ${BASE_URL.replace(TOKEN, 'TOKEN_REDACTED')}`);
  console.log(`Web App Target: ${getWebUrl()}`);
  console.log(`------------------------------------------------------`);
  console.log(`AVATAR SETUP: open @BotFather in Telegram, send /setuserpic,`);
  console.log(`select @${BOT_USERNAME}, and upload '${AVATAR_FILE}'`);
  console.log(`======================================================\n`);

  // Verify Bot identity
  const me = await callApi('getMe');
  if (!me.ok) {
    console.error('Failed to authenticate bot with Telegram API:', me.description);
    process.exit(1);
  }

  console.log(`Authenticated as: ${me.result.first_name} (@${me.result.username})`);
  await registerBotCommands();
  await loadState();
  console.log(`Saved state: ${Object.keys(state.subscribers).length} chats, file ${STATE_FILE}`);
  setInterval(() => { void dailyRun(); }, 60_000);
  void dailyRun();
  console.log(`Long polling initialized. Waiting for messages...\n`);

  let offset = 0;

  while (true) {
    try {
      const updates = await callApi('getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query'],
      });

      if (updates.ok && Array.isArray(updates.result)) {
        for (const update of updates.result) {
          offset = update.update_id + 1;

          try {
            if (update.message) {
              await handleMessage(update.message);
            } else if (update.callback_query) {
              await handleCallbackQuery(update.callback_query);
            }
          } catch (err) {
            console.error('[Update Handler Error]:', err.message);
          }
        }
      } else if (!updates.ok) {
        if (updates.description && updates.description.includes('Conflict')) {
          console.warn('Telegram 409 Conflict: another process called getUpdates. Retrying in 4s...');
          await new Promise((r) => setTimeout(r, 4000));
        } else {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    } catch (err) {
      console.error('[Polling Loop Error]:', err.message);
      // Wait 3 seconds on failure before retrying
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nQADAM Telegram Bot shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nQADAM Telegram Bot terminating...');
  process.exit(0);
});

// Start the bot
startPolling();
