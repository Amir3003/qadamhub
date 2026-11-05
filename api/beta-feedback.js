// POST /api/beta-feedback: beta feedback and star ratings from the in-app Feedback button.
// The report is validated and stored in the Supabase table `feedback` with the service role
// key (server-only env SUPABASE_SERVICE_ROLE_KEY). The table has no policies, so browsers can
// never read or write it directly. Without the key the endpoint answers 503 and the widget
// offers email instead.
import { clientIp, isSameOrigin, rateLimit, readJsonObject, sendJson } from './_lib/security.js';
import { neon } from '@neondatabase/serverless';
import { createHmac } from 'node:crypto';

const MAX_BODY_BYTES = 8 * 1024;
const TYPES = ['bug', 'feature', 'general', 'rating'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PATH = /^\/[A-Za-z0-9\-._~/]{0,198}$/;
const UNAVAILABLE = 'Feedback is not available right now.';

function supabase() {
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  try {
    const url = new URL(base);
    return key && url.protocol === 'https:' ? { url: url.origin, key } : null;
  } catch {
    return null;
  }
}

// Keeps line breaks (reports are often multi-line), drops other control characters.
function cleanDescription(value) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Only the path is stored: query strings and fragments can carry invite codes or tokens.
function cleanPath(value) {
  if (typeof value !== 'string') return '/';
  const path = value.split(/[?#]/)[0];
  return PATH.test(path) ? path : '/';
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return sendJson(response, 405, { status: 'error', message: 'Method not allowed.' }, { Allow: 'POST' });
  if (!isSameOrigin(request)) return sendJson(response, 403, { status: 'error', message: 'Cross-origin requests are not allowed.' });

  const limit = rateLimit(`beta-feedback:${clientIp(request)}`, 8, 60 * 60_000);
  if (!limit.ok) {
    return sendJson(response, 429, { status: 'error', message: 'Too many reports. Please try again later.' }, { 'Retry-After': String(limit.retryAfter) });
  }

  const body = readJsonObject(request, MAX_BODY_BYTES);
  if (!body) return sendJson(response, 422, { status: 'error', message: 'Invalid request.' });

  // Honeypot: people never fill this hidden field, so pretend success for bots.
  if (typeof body.website === 'string' && body.website.length > 0) return sendJson(response, 200, { status: 'ok' });

  if (!TYPES.includes(body.type)) return sendJson(response, 422, { status: 'error', message: 'Choose a feedback type.' });
  const isRating = body.type === 'rating';
  const rating = Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5 ? body.rating : null;
  if (isRating && rating === null) return sendJson(response, 422, { status: 'error', message: 'Choose 1 to 5 stars.' });
  const description = typeof body.description === 'string' ? cleanDescription(body.description) : '';
  // A rating may come without a comment; every other report needs a real description.
  if (!isRating && description.length < 10) return sendJson(response, 422, { status: 'error', message: 'Please describe it in at least 10 characters.' });
  if (description.length > 2000) return sendJson(response, 422, { status: 'error', message: 'Please keep it under 2000 characters.' });

  const neonUrl = process.env.NEON_DATABASE_URL || '';
  // Never silently write reports to the old database when a Neon build is selected.
  const useNeon = Boolean(process.env.VITE_NEON_URL || neonUrl);
  const target = useNeon ? null : supabase();
  if (useNeon ? !neonUrl : !target) return sendJson(response, 503, { status: 'error', message: UNAVAILABLE });
  const secret = process.env.FORMS_IP_HASH_SECRET || '';
  const ip = clientIp(request);
  if (useNeon && (secret.length < 32 || ip === 'unknown')) return sendJson(response, 503, { status: 'error', message: UNAVAILABLE });

  const row = {
    type: body.type,
    description,
    rating: isRating ? rating : null,
    user_id: typeof body.userId === 'string' && UUID.test(body.userId) ? body.userId.toLowerCase() : null,
    page_path: cleanPath(body.pageUrl),
    user_agent: String(request.headers['user-agent'] || '').slice(0, 300) || null,
  };

  try {
    if (useNeon) {
      const sql = neon(neonUrl);
      const key = createHmac('sha256', secret).update(ip).digest('hex');
      const result = await sql`select qadam_private.submit_feedback(${key}, ${JSON.stringify(row)}::jsonb) as accepted`;
      if (!result[0]?.accepted) return sendJson(response, 429, { status: 'error', message: 'Too many reports. Please try again later.' }, { 'Retry-After': '3600' });
      return sendJson(response, 200, { status: 'ok' });
    }
    const res = await fetch(`${target.url}/rest/v1/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: target.key,
        Authorization: `Bearer ${target.key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      // Diagnostics: only the HTTP status and the PostgREST/Postgres error code are returned.
      // Never the key, the URL or the request body.
      let code = null;
      try {
        const detail = await res.json();
        if (detail && typeof detail.code === 'string' && /^[A-Za-z0-9_]{1,16}$/.test(detail.code)) code = detail.code;
      } catch {
        // The error body is optional.
      }
      return sendJson(response, 502, {
        status: 'error',
        message: UNAVAILABLE,
        reason: `Supabase responded with HTTP ${res.status}`,
        dbCode: code || String(res.status),
      });
    }
  } catch (error) {
    const timedOut = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return sendJson(response, 502, {
      status: 'error',
      message: UNAVAILABLE,
      reason: timedOut ? `${useNeon ? 'Neon' : 'Supabase'} request timed out` : `${useNeon ? 'Neon' : 'Supabase'} request failed`,
      dbCode: null,
    });
  }

  return sendJson(response, 200, { status: 'ok' });
}
