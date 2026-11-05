import { createHmac } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { clientIp, isSameOrigin, readJsonObject, sendJson } from './_lib/security.js';

const text = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
const ROLES = ['Director', 'Program lead', 'Career staff', 'Other'];
const SIZES = ['Under 30', '30 to 50', '50 to 100', 'Over 100'];
const TYPES = ['hackathon', 'grant', 'internship', 'other'];
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$/;
const validDate = value => {
  if (value === '' || value === null) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const validPhone = value => {
  if (typeof value !== 'string' || value.length > 60) return false;
  if (!value || /^@[A-Za-z0-9_]{5,32}$/.test(value)) return true;
  const digits = value.replace(/\D/g, '');
  return /^\+?[0-9 ()-]+$/.test(value) && digits.length >= 10 && digits.length <= 15 && !/^(\d)\1+$/.test(digits);
};

function valid(kind, b) {
  if (kind === 'pilot') {
    return text(b.institution, 2, 160) && /\p{L}/u.test(b.institution) && text(b.contact_name, 2, 120) && /\p{L}/u.test(b.contact_name) && !/\d/.test(b.contact_name) && ROLES.includes(b.role) &&
      text(b.email, 5, 200) && EMAIL.test(b.email.trim()) && text(b.city, 2, 60) && SIZES.includes(b.cohort_size) &&
      /\p{L}/u.test(b.city) && !/\d/.test(b.city) && validPhone(b.phone) && typeof b.message === 'string' &&
      b.message.length <= 1000 && (!b.message || (b.message.length >= 10 && /\s/.test(b.message)));
  }
  if (kind === 'suggestion') {
    let url;
    try { url = new URL(b.url); } catch { return false; }
    return text(b.title, 3, 200) && text(b.url, 1, 500) && ['http:', 'https:'].includes(url.protocol) &&
      TYPES.includes(b.type) && validDate(b.deadline) &&
      typeof b.note === 'string' && b.note.length <= 500;
  }
  return false;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return sendJson(response, 405, { status: 'error' }, { Allow: 'POST' });
  if (!isSameOrigin(request)) return sendJson(response, 403, { status: 'error' });
  const body = readJsonObject(request, 4096);
  if (!body) return sendJson(response, 422, { status: 'error' });
  if (typeof body.website === 'string' && body.website) return sendJson(response, 200, { status: 'ok' });
  const kind = body.kind;
  if (!valid(kind, body.data || {})) return sendJson(response, 422, { status: 'error' });
  const dbUrl = process.env.NEON_FORMS_DATABASE_URL || '';
  const secret = process.env.FORMS_IP_HASH_SECRET || '';
  const ip = clientIp(request);
  if (!dbUrl || secret.length < 32 || ip === 'unknown') return sendJson(response, 503, { status: 'error' });
  const key = createHmac('sha256', secret).update(ip).digest('hex');
  try {
    const sql = neon(dbUrl);
    const result = await sql`select qadam_private.submit_public_form(${kind}, ${key}, ${JSON.stringify(body.data)}::jsonb) as accepted`;
    if (!result[0]?.accepted) return sendJson(response, 429, { status: 'limited' }, { 'Retry-After': '3600' });
    return sendJson(response, 200, { status: 'ok' });
  } catch {
    return sendJson(response, 503, { status: 'error' });
  }
}
