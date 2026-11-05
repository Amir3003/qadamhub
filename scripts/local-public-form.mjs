// Local staging-only adapter. It is not intended to run on an Internet-facing host.
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import handler from '../api/public-form.js';

const setupToken = randomBytes(32).toString('hex');
let configured = false;
delete process.env.NEON_FORMS_DATABASE_URL;
process.env.FORMS_IP_HASH_SECRET = randomBytes(32).toString('hex');

function answer(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; form-action 'self'; base-uri 'none'" });
  res.end(body);
}
async function read(req, limit = 8192) {
  let total = 0;
  const parts = [];
  for await (const part of req) {
    total += part.length;
    if (total > limit) throw new Error('Request too large');
    parts.push(part);
  }
  return Buffer.concat(parts).toString('utf8');
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === `/_setup/${setupToken}` && req.method === 'GET' && !configured) {
      return answer(res, 200, `<!doctype html><html lang="ru"><meta charset="utf-8"><title>QADAM: тестовая база</title><main><h1>Подключение тестовой базы</h1><p>Строка подключения хранится только в памяти на время работы локального тестового сервера.</p><form method="post" action="/_setup/${setupToken}"><label>Строка подключения Neon <input name="connection" type="password" autocomplete="off" required></label><button>Подключить</button></form></main></html>`, 'text/html; charset=utf-8');
    }
    if (req.url === `/_setup/${setupToken}` && req.method === 'POST' && !configured) {
      if (req.headers.origin !== 'http://localhost:8789') return answer(res, 403, 'Invalid origin');
      const value = new URLSearchParams(await read(req)).get('connection')?.trim() || '';
      let uri;
      try { uri = new URL(value); } catch { return answer(res, 400, 'Invalid connection string'); }
      if (!['postgres:', 'postgresql:'].includes(uri.protocol) || !/^ep-withered-sky-ba3mfoel(?:-pooler)?\.[a-z0-9.-]+\.aws\.neon\.tech$/i.test(uri.hostname) || uri.pathname !== '/neondb' || !uri.username || !uri.password || uri.searchParams.get('sslmode') !== 'require') {
        return answer(res, 400, 'This is not the expected TLS-enabled QADAM staging database.');
      }
      try {
        const sql = neon(value);
        const check = await sql`select current_database() as name`;
        if (check[0]?.name !== 'neondb') throw new Error('Wrong database');
        process.env.NEON_FORMS_DATABASE_URL = value;
        configured = true;
        return answer(res, 200, 'Тестовая база подключена. Можно вернуться в чат.', 'text/plain; charset=utf-8');
      } catch {
        return answer(res, 502, 'Could not connect to the staging database; no credentials were saved.');
      }
    }
    if (req.url === '/api/public-form' && req.method === 'POST') {
      const raw = await read(req, 4096);
      let body;
      try { body = JSON.parse(raw); } catch { return answer(res, 422, '{"status":"error"}', 'application/json'); }
      // Never trust client-provided forwarding headers in this local-only adapter.
      const headers = { ...req.headers, 'x-forwarded-for': req.socket.remoteAddress || 'unknown' };
      const response = { setHeader: (k, v) => res.setHeader(k, v), status: n => { res.statusCode = n; return response; }, json: value => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(value)); } };
      return await handler({ method: req.method, headers, body }, response);
    }
    return answer(res, 404, 'Not found');
  } catch {
    if (!res.headersSent) return answer(res, 500, 'Local test request failed');
    res.end();
  }
});
server.listen(8789, '127.0.0.1', () => {
  console.log('Local form API listening only on 127.0.0.1:8789');
  console.log(`Setup: http://localhost:8789/_setup/${setupToken}`);
});
