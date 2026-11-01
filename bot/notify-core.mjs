// Notification logic for the Telegram bot, kept free of network and files so it can be tested.
// Three kinds of message, all opt in:
//   digest:   once a day, the listings that appeared since the last run (people who sent /subscribe)
//   reminder: 7, 3 and 1 day before the deadline of a listing the person tracks
//   opens:    on the 1st of a month in which a tracked yearly program usually opens
// Nothing is sent to a chat that did not ask for it.

export const REMINDER_DAYS = [7, 3, 1];
// 09:00 in Astana (UTC+5) is 04:00 UTC.
export const RUN_HOUR_UTC = 4;
const MAX_DIGEST_ITEMS = 5;
const MAX_TRACKED = 30;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function emptyState() {
  return { version: 1, subscribers: {}, seen: null, lastRun: null };
}

export function normalizeState(raw) {
  const state = emptyState();
  if (!raw || typeof raw !== 'object') return state;
  if (Array.isArray(raw.seen)) state.seen = raw.seen.filter((id) => typeof id === 'string');
  if (typeof raw.lastRun === 'string') state.lastRun = raw.lastRun;
  for (const [chatId, sub] of Object.entries(raw.subscribers || {})) {
    if (!/^-?\d+$/.test(chatId) || !sub || typeof sub !== 'object') continue;
    state.subscribers[chatId] = {
      since: typeof sub.since === 'string' ? sub.since : null,
      digest: sub.digest === true,
      tracked: Array.isArray(sub.tracked) ? sub.tracked.filter((id) => typeof id === 'string').slice(0, MAX_TRACKED) : [],
      sent: sub.sent && typeof sub.sent === 'object' ? { ...sub.sent } : {},
    };
  }
  return state;
}

function record(state, chatId, now) {
  const key = String(chatId);
  if (!state.subscribers[key]) state.subscribers[key] = { since: now.slice(0, 10), digest: false, tracked: [], sent: {} };
  return state.subscribers[key];
}

export function subscribeDigest(state, chatId, now) {
  record(state, chatId, now).digest = true;
}

// Removes everything stored about the chat.
export function forget(state, chatId) {
  delete state.subscribers[String(chatId)];
}

export function daysUntil(deadline, today) {
  if (!deadline) return null;
  return Math.round((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

// Tracking a listing that is already inside a reminder window must not fire the reminders that
// are already behind it, so those are marked as sent right away.
export function track(state, chatId, item, today, now) {
  const sub = record(state, chatId, now);
  if (!sub.tracked.includes(item.id)) {
    if (sub.tracked.length >= MAX_TRACKED) return { ok: false, reason: 'limit' };
    sub.tracked.push(item.id);
  }
  const days = daysUntil(item.deadline, today);
  if (days !== null) for (const t of REMINDER_DAYS) if (days <= t) sub.sent[`${item.id}|${t}`] = today;
  return { ok: true };
}

export function untrack(state, chatId, id) {
  const sub = state.subscribers[String(chatId)];
  if (!sub) return;
  sub.tracked = sub.tracked.filter((x) => x !== id);
  for (const key of Object.keys(sub.sent)) if (key.startsWith(`${id}|`)) delete sub.sent[key];
  if (!sub.digest && sub.tracked.length === 0) forget(state, chatId);
}

export function describe(item) {
  return `${item.type}${item.organization ? ` · ${item.organization}` : ''} · Deadline: ${item.deadline || 'see the official page'}`;
}

// Next 09:00 Astana run (04:00 UTC) strictly after `now`, as a number of milliseconds to wait.
export function msUntilNextRun(nowMs) {
  const now = new Date(nowMs);
  let next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RUN_HOUR_UTC);
  if (next <= nowMs) next += 86_400_000;
  return next - nowMs;
}

// True when today's run is due and has not happened yet (also catches up after a restart).
export function runDue(state, nowMs) {
  const now = new Date(nowMs);
  const today = now.toISOString().slice(0, 10);
  return state.lastRun !== today && now.getUTCHours() >= RUN_HOUR_UTC;
}

// Builds today's messages. Pure: the caller sends them, then calls `commit` with the ones that went out.
// Returns { messages, commit(state, sentMessages) }.
export function plan(state, items, nowMs) {
  const now = new Date(nowMs).toISOString();
  const today = now.slice(0, 10);
  const monthIndex = new Date(nowMs).getUTCMonth();
  const byId = new Map(items.map((item) => [item.id, item]));
  const messages = [];

  // First run ever: remember what exists, announce nothing.
  const firstRun = state.seen === null;
  const seen = new Set(state.seen || []);
  const fresh = firstRun ? [] : items.filter((item) => !seen.has(item.id));

  for (const [chatId, sub] of Object.entries(state.subscribers)) {
    if (sub.digest && fresh.length) {
      const shown = fresh.slice(0, MAX_DIGEST_ITEMS);
      const more = fresh.length - shown.length;
      messages.push({
        chatId,
        kind: 'digest',
        text: `<b>QADAM Radar: new today</b>\n\n${shown.map((item, i) => `${i + 1}. <b>${esc(item.title)}</b>\n${esc(describe(item))}`).join('\n\n')}${more > 0 ? `\n\n+${more} more. Send /radar to see them.` : ''}\n\nTap Track to get reminders before the deadline. /unsubscribe stops these messages.`,
        items: shown,
        marks: [],
      });
    }

    for (const id of sub.tracked) {
      const item = byId.get(id);
      if (!item) continue;
      const days = daysUntil(item.deadline, today);
      if (days !== null && days >= 0) {
        const due = REMINDER_DAYS.filter((t) => days <= t && !sub.sent[`${id}|${t}`]);
        if (due.length) {
          messages.push({
            chatId,
            kind: 'reminder',
            text: `<b>${days === 0 ? 'Deadline today' : days === 1 ? 'Deadline tomorrow' : `Deadline in ${days} days`}</b>\n\n<b>${esc(item.title)}</b>\n${esc(describe(item))}\n\nCheck the details on the official page before you apply.`,
            items: [item],
            marks: due.map((t) => `${id}|${t}`),
          });
        }
      }
      // A yearly program that usually opens this month: said once, on the 1st.
      const openKey = `${id}|open|${today.slice(0, 7)}`;
      if (today.slice(8, 10) === '01' && item.opensMonths.includes(monthIndex + 1) && !sub.sent[openKey]) {
        messages.push({
          chatId,
          kind: 'opens',
          text: `<b>Usually opens this month: ${MONTHS[monthIndex]}</b>\n\n<b>${esc(item.title)}</b>\n${esc(describe(item))}\n\nThis is the usual timing, not a confirmed date. Check the official page.`,
          items: [item],
          marks: [openKey],
        });
      }
    }
  }

  return {
    messages,
    commit(nextState, sent) {
      for (const message of sent) {
        const sub = nextState.subscribers[message.chatId];
        if (sub) for (const mark of message.marks) sub.sent[mark] = today;
      }
      nextState.seen = [...new Set([...(nextState.seen || []), ...items.map((item) => item.id)])];
      nextState.lastRun = today;
    },
  };
}

// Telegram HTML mode only needs these three escaped.
function esc(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); // nosemgrep: javascript.audit.detect-replaceall-sanitization.detect-replaceall-sanitization
}
