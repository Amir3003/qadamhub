import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('feedback database limit is shared and does not grant table access', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anonymous; create role authenticated; create role reporter;
      create schema qadam_private;
      create table qadam_private.form_rate_limits(kind text not null,client_key text not null,window_started timestamptz not null,attempts integer not null,primary key(kind,client_key));`);
    for (const name of ['202610310001_feedback.sql', '202610310002_feedback_rating.sql', '202611040005_feedback_rate_limit.sql']) {
      await db.exec(await readFile(new URL(`../neon/migrations/${name}`, import.meta.url), 'utf8'));
    }
    await db.exec(`grant usage on schema qadam_private to reporter;
      grant execute on function qadam_private.submit_feedback(text,jsonb) to reporter;
      set role reporter`);
    const row = JSON.stringify({type:'bug',description:'A test report with enough text.',rating:null,user_id:null,page_path:'/',user_agent:'test'});
    for (let i=0; i<8; i++) assert.equal((await db.query('select qadam_private.submit_feedback($1,$2::jsonb) as ok', ['a'.repeat(64), row])).rows[0].ok, true);
    assert.equal((await db.query('select qadam_private.submit_feedback($1,$2::jsonb) as ok', ['a'.repeat(64), row])).rows[0].ok, false);
    assert.equal((await db.query('select qadam_private.submit_feedback($1,$2::jsonb) as ok', ['b'.repeat(64), row])).rows[0].ok, true);
    await assert.rejects(db.query('select * from public.feedback'), /permission denied/);
    await db.exec('reset role');
    assert.equal((await db.query('select count(*)::int as n from public.feedback')).rows[0].n, 9);
    await db.query("update qadam_private.form_rate_limits set window_started=now()-interval '61 minutes' where kind='feedback' and client_key=$1", ['a'.repeat(64)]);
    await db.exec('set role reporter');
    assert.equal((await db.query('select qadam_private.submit_feedback($1,$2::jsonb) as ok', ['a'.repeat(64), row])).rows[0].ok, true);
  } finally { await db.close(); }
});
