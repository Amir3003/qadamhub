// Request guards shared by the public /api/* form endpoints.

// Fixed-window limiter in function memory. Each serverless instance keeps its own counter, so
// this stops casual abuse; hard limits belong in the Vercel firewall.
const buckets = new Map();
const MAX_KEYS = 10_000;

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) {
    for (const [k, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(k);
    if (buckets.size > MAX_KEYS) buckets.clear();
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  return { ok: bucket.count <= limit, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
}

// On Vercel the edge overwrites x-forwarded-for, so its first entry is the client.
export function clientIp(request) {
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(request.headers['x-real-ip'] || 'unknown');
}

// The form API is same-origin only (CSRF defence): browsers always send Origin on cross-site POSTs.
export function isSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return request.headers['sec-fetch-site'] !== 'cross-site';
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Vercel parses JSON bodies; this rejects anything that is not a plain object of a sane size.
export function readJsonObject(request, maxBytes) {
  const type = String(request.headers['content-type'] || '').toLowerCase();
  if (!type.startsWith('application/json')) return null;
  if (Number(request.headers['content-length'] || 0) > maxBytes) return null;
  let body = request.body;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > maxBytes) return null;
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  // Vercel may already have parsed the body, and Content-Length can be absent.
  try {
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > maxBytes) return null;
  } catch {
    return null;
  }
  return body;
}

// Strips control characters and collapses whitespace.
export const cleanText = (value, maxLength) =>
  value.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);

export function sendJson(response, status, body, headers = {}) {
  response.setHeader('Cache-Control', 'no-store');
  for (const [key, value] of Object.entries(headers)) response.setHeader(key, value);
  response.status(status).json(body);
}
