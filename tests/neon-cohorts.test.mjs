import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('all Neon migrations apply and only staff can create their institution cohorts', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anonymous; create role authenticated; create role form_writer;
      create schema auth; create schema neon_auth; create schema extensions;
      create table neon_auth."user"(id uuid primary key, email text);
      create function auth.user_id() returns text language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'') $$;
      grant usage on schema auth, public to authenticated, anonymous;
      grant execute on function auth.user_id() to authenticated, anonymous;
      create function extensions.gen_random_bytes(n integer) returns bytea language sql as
        $$ select substring(decode(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),'hex') from 1 for n) $$;
      create function extensions.digest(t text, algo text) returns bytea language sql as
        $$ select sha256(convert_to(t,'UTF8')) $$;`);
    const dir = new URL('../neon/migrations/', import.meta.url);
    for (const name of (await readdir(dir)).filter(n => n.endsWith('.sql')).sort()) {
      const sql = (await readFile(new URL(name, dir), 'utf8'))
        .replace('create extension if not exists pgcrypto with schema extensions;', '')
        .replace('create extension if not exists pgcrypto;', '');
      await db.exec(sql);
    }
    const staff = '00000000-0000-0000-0000-000000000001';
    const outsider = '00000000-0000-0000-0000-000000000002';
    const learner = '00000000-0000-0000-0000-000000000003';
    await db.query('insert into neon_auth."user"(id,email) values ($1,$2),($3,$4),($5,$6)', [staff, 'staff@example.invalid', outsider, 'other@example.invalid', learner, 'learner@example.invalid']);
    const { rows } = await db.query("insert into institutions(name) values('Test school') returning id");
    await db.query('insert into institution_members(institution_id,user_id) values($1,$2)', [rows[0].id, staff]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [staff]);
    await db.exec('set role authenticated');
    const created = await db.query("insert into cohorts(institution_id,name) values($1,'Test cohort') returning id, invite_code", [rows[0].id]);
    const cohort = created.rows[0];
    assert.match(cohort.invite_code, /^[A-F0-9]{24}$/);
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [learner]);
    await db.exec('set role authenticated');
    await db.query('select join_cohort($1)', [cohort.invite_code]);
    await db.query("insert into learner_progress(user_id,full_name) values($1,'Test Learner')", [learner]);
    await assert.rejects(db.query('select * from cohort_roster($1)', [cohort.id]), /Not staff/);
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [outsider]);
    await db.exec('set role authenticated');
    await assert.rejects(db.query("insert into cohorts(institution_id,name) values($1,'Forbidden')", [rows[0].id]), /row-level security/);
    assert.equal((await db.query('select * from learner_progress where user_id=$1', [learner])).rows.length, 0);
    await assert.rejects(db.query('select * from cohort_roster($1)', [cohort.id]), /Not staff/);
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [staff]);
    await db.exec('set role authenticated');
    const roster = await db.query('select user_id,full_name from cohort_roster($1)', [cohort.id]);
    assert.deepEqual(roster.rows, [{ user_id: learner, full_name: 'Test Learner' }]);
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub','anonymous',false)");
    await db.exec('set role anonymous');
    await assert.rejects(db.query("insert into opportunity_suggestions(title,url,type,note) values ('Test Grant','https://example.invalid','grant','')"), /permission denied/);
    await assert.rejects(db.query("insert into pilot_requests(institution,contact_name,role,email,city,cohort_size) values ('Test School','Test Person','Other','test@example.invalid','Astana','Under 30')"), /permission denied/);
    await assert.rejects(db.query('select * from pilot_requests'), /permission denied/);
    await assert.rejects(db.query("select qadam_private.submit_public_form('suggestion',$1,$2::jsonb)", ['a'.repeat(64), '{}']), /permission denied/);
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [learner]);
    await db.exec('set role authenticated');
    await assert.rejects(db.query("insert into opportunity_suggestions(title,url,type,note) values ('Test Grant','https://example.invalid','grant','')"), /permission denied/);
    await assert.rejects(db.query("insert into pilot_requests(institution,contact_name,role,email,city,cohort_size) values ('Test School','Test Person','Other','test@example.invalid','Astana','Under 30')"), /permission denied/);
    await db.exec('reset role');
    await db.exec('grant usage on schema qadam_private to form_writer; grant execute on function qadam_private.submit_public_form(text,text,jsonb) to form_writer');
    await db.exec('set role form_writer');
    const form = JSON.stringify({title:'Test Grant',url:'https://example.invalid',type:'grant',deadline:'',note:''});
    for (let i = 0; i < 5; i++) assert.equal((await db.query("select qadam_private.submit_public_form('suggestion',$1,$2::jsonb) as ok", ['a'.repeat(64),form])).rows[0].ok, true);
    assert.equal((await db.query("select qadam_private.submit_public_form('suggestion',$1,$2::jsonb) as ok", ['a'.repeat(64),form])).rows[0].ok, false);
    assert.equal((await db.query("select qadam_private.submit_public_form('suggestion',$1,$2::jsonb) as ok", ['b'.repeat(64),form])).rows[0].ok, true);
    const pilot = JSON.stringify({institution:'Test School',contact_name:'Test Person',role:'Other',email:'test@example.invalid',phone:'',city:'Astana',cohort_size:'Under 30',message:''});
    assert.equal((await db.query("select qadam_private.submit_public_form('pilot',$1,$2::jsonb) as ok", ['a'.repeat(64),pilot])).rows[0].ok, true);
    await assert.rejects(db.query('select * from public.opportunity_suggestions'), /permission denied/);
    await db.exec('reset role');
    assert.equal((await db.query("select count(*)::int as n from opportunity_suggestions")).rows[0].n, 6);
  } finally { await db.close(); }
});
