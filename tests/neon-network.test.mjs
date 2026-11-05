import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('Neon policies isolate private profiles and direct messages', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anonymous; create role authenticated;
      create schema auth; create schema neon_auth; create schema extensions;
      create table neon_auth."user"(id uuid primary key, email text);
      create function auth.user_id() returns text language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'') $$;
      grant usage on schema auth, public to authenticated, anonymous;
      grant execute on function auth.user_id() to authenticated, anonymous;
      create function extensions.gen_random_bytes(n integer) returns bytea language sql as
        $$ select decode(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),'hex') $$;
      create function extensions.digest(t text, algo text) returns bytea language sql as
        $$ select sha256(convert_to(t,'UTF8')) $$;
    `);
    for (const name of ['202610180001_network.sql', '202610200001_social.sql']) {
      const sql = await readFile(new URL(`../neon/migrations/${name}`, import.meta.url), 'utf8');
      await db.exec(sql.replace('create extension if not exists pgcrypto with schema extensions;', ''));
    }
    const ids = [1, 2, 3].map(n => `00000000-0000-0000-0000-00000000000${n}`);
    for (const id of ids) await db.query('insert into neon_auth."user"(id) values ($1)', [id]);
    const as = async id => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
      await db.exec('set role authenticated');
    };
    for (const [i, id] of ids.entries()) {
      await as(id);
      await db.query('insert into network_profiles(id,name,is_public) values($1,$2,false)', [id, `User ${i}`]);
    }
    await as(ids[0]);
    assert.equal((await db.query('select * from network_profiles')).rows.length, 1);
    const { rows } = await db.query('select public.network_create_invite(null) as token');
    await as(ids[1]);
    await db.query('select public.network_accept_invite($1)', [rows[0].token]);
    await db.query('insert into network_messages(sender_id,recipient_id,content) values($1,$2,$3)', [ids[1], ids[0], 'Hello']);
    await as(ids[2]);
    assert.equal((await db.query('select * from network_messages')).rows.length, 0);
    await assert.rejects(db.query('insert into network_messages(sender_id,recipient_id,content) values($1,$2,$3)', [ids[2], ids[0], 'No access']), /row-level security/);
  } finally {
    await db.close();
  }
});
