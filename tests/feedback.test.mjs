import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import handler from "../api/beta-feedback.js";

let ipCounter = 0;
const uuid = "00000000-0000-0000-0000-0000000000aa";

function call({ method = "POST", body, headers = {}, ip } = {}) {
  const request = {
    method,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip || `10.0.0.${++ipCounter}`,
      "user-agent": "node-test",
      ...headers,
    },
    body,
  };
  const out = { status: 0, json: null, headers: {} };
  const response = {
    setHeader: (key, value) => (out.headers[key] = value),
    status(code) {
      out.status = code;
      return this;
    },
    json(value) {
      out.json = value;
    },
  };
  return handler(request, response).then(() => out);
}

const valid = { type: "bug", description: "The quiz button does nothing on mobile.", pageUrl: "/cv", userId: uuid };

function withSupabase(fn) {
  return async () => {
    const calls = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return { ok: true, status: 201 };
    };
    const saved = { ...process.env };
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    try {
      await fn(calls);
    } finally {
      globalThis.fetch = realFetch;
      process.env = saved;
    }
  };
}

test("rejects wrong method and cross-origin requests", async () => {
  assert.equal((await call({ method: "GET" })).status, 405);
  const cross = await call({ body: valid, headers: { origin: "https://evil.example", host: "www.qadamhub.com" } });
  assert.equal(cross.status, 403);
});

test("validates type and description", async () => {
  assert.equal((await call({ body: { ...valid, type: "other" } })).status, 422);
  assert.equal((await call({ body: { ...valid, description: "short" } })).status, 422);
  assert.equal((await call({ body: { ...valid, description: "x".repeat(2001) } })).status, 422);
  assert.equal((await call({ body: "not json" })).status, 422);
});

test("honeypot answers ok without storing anything", withSupabase(async (calls) => {
  const out = await call({ body: { ...valid, website: "http://spam.example" } });
  assert.equal(out.status, 200);
  assert.equal(calls.length, 0);
}));

test("rejects oversized parsed requests without Content-Length", withSupabase(async (calls) => {
  assert.equal((await call({ body: { ...valid, extra: "x".repeat(9000) } })).status, 422);
  assert.equal(calls.length, 0);
}));

test("stores a clean row with the service role key", withSupabase(async (calls) => {
  const out = await call({
    body: { ...valid, pageUrl: "/student?code=SECRET123#frag", description: "  Line one\n\n\n\nLine two\u0000 with control  " },
  });
  assert.equal(out.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/feedback");
  assert.equal(calls[0].init.headers.apikey, "service-key");
  assert.equal(calls[0].init.headers.Authorization, "Bearer service-key");
  const row = JSON.parse(calls[0].init.body);
  assert.deepEqual(row, {
    type: "bug",
    description: "Line one\n\nLine two with control",
    rating: null,
    user_id: uuid,
    page_path: "/student",
    user_agent: "node-test",
  });
}));

test("drops a malformed user id and an unsafe page path", withSupabase(async (calls) => {
  await call({ body: { ...valid, userId: "not-a-uuid", pageUrl: "https://evil.example/x" } });
  const row = JSON.parse(calls[0].init.body);
  assert.equal(row.user_id, null);
  assert.equal(row.page_path, "/");
}));

test("answers 503 without the service key and 502 when the database fails", async () => {
  const saved = { ...process.env };
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    assert.equal((await call({ body: valid })).status, 503);
  } finally {
    process.env = saved;
  }
  await withSupabase(async () => {
    globalThis.fetch = async () => ({ ok: false, status: 500 });
    assert.equal((await call({ body: valid })).status, 502);
  })();
});

test("502 reports the Supabase status and error code, never the key", withSupabase(async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    json: async () => ({ code: "PGRST205", message: "Could not find the table", hint: "service-key" }),
  });
  const missing = await call({ body: valid });
  assert.equal(missing.status, 502);
  assert.equal(missing.json.reason, "Supabase responded with HTTP 404");
  assert.equal(missing.json.dbCode, "PGRST205");
  assert.ok(!JSON.stringify(missing.json).includes("service-key"));
  assert.ok(!JSON.stringify(missing.json).includes("example.supabase.co"));

  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => { throw new Error("not json"); } });
  const denied = await call({ body: valid });
  assert.equal(denied.json.reason, "Supabase responded with HTTP 401");
  assert.equal(denied.json.dbCode, "401");

  globalThis.fetch = async () => { throw new Error("connect failed to https://example.supabase.co with service-key"); };
  const down = await call({ body: valid });
  assert.equal(down.status, 502);
  assert.equal(down.json.reason, "Supabase request failed");
  assert.ok(!JSON.stringify(down.json).includes("service-key"));
}));

test("limits reports per client", withSupabase(async () => {
  const ip = "10.9.9.9";
  for (let i = 0; i < 8; i++) assert.equal((await call({ body: valid, ip })).status, 200);
  const blocked = await call({ body: valid, ip });
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers["Retry-After"]);
}));

test("stores a star rating with an optional comment", withSupabase(async (calls) => {
  const bare = await call({ body: { type: "rating", rating: 5, pageUrl: "/" } });
  assert.equal(bare.status, 200);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    type: "rating", description: "", rating: 5, user_id: null, page_path: "/", user_agent: "node-test",
  });
  await call({ body: { type: "rating", rating: 2, description: "Quizzes load slowly", pageUrl: "/cv" } });
  assert.equal(JSON.parse(calls[1].init.body).description, "Quizzes load slowly");
  // The stars are ignored on other types.
  await call({ body: { ...valid, rating: 5 } });
  assert.equal(JSON.parse(calls[2].init.body).rating, null);
}));

test("rejects a rating without valid stars", async () => {
  for (const rating of [undefined, 0, 6, 3.5, "5"]) {
    assert.equal((await call({ body: { type: "rating", rating } })).status, 422);
  }
});

test("feedback table: browsers cannot touch it and bad rows are refused", async () => {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; grant usage on schema public to anon, authenticated;");
  for (const file of ["202610310001_feedback.sql", "202610310002_feedback_rating.sql"]) {
    await db.exec(await fs.readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
  }
  const insert = (type, description, path = "/cv", rating = null) =>
    db.query("insert into public.feedback (type, description, page_path, rating) values ($1, $2, $3, $4)", [type, description, path, rating]);

  await insert("bug", "A valid report with enough text.");
  await assert.rejects(insert("rant", "A valid report with enough text."));
  await assert.rejects(insert("bug", "too short"));
  await assert.rejects(insert("bug", "x".repeat(2001)));
  await assert.rejects(insert("bug", "A valid report with enough text.", "cv"));
  // Ratings: stars required, 1 to 5, comment optional; stars only on ratings.
  await insert("rating", "", "/", 5);
  await insert("rating", "Nice quizzes", "/cv", 3);
  await assert.rejects(insert("rating", "", "/", null));
  await assert.rejects(insert("rating", "", "/", 6));
  await assert.rejects(insert("bug", "A valid report with enough text.", "/", 4));

  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query("select * from public.feedback"), /permission denied/);
    await assert.rejects(insert("bug", "A valid report with enough text."), /permission denied/);
    await db.exec("reset role");
  }
  const { rows } = await db.query("select status from public.feedback");
  assert.equal(rows.length, 3);
  assert.ok(rows.every((row) => row.status === "new"));
  await db.close();
});
