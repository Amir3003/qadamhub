-- Generated for an empty Neon staging database; see scripts/make-neon-migrations.py.
-- Phase 2: institutions, staff, cohorts with invite codes, learners and their progress.
-- Run once in the Supabase SQL editor after the earlier migrations.
--
-- Access model (row level security):
--   * Staff of an institution see its cohorts, the learners in them and their progress.
--   * A learner sees their own rows and the cohort they joined.
--   * Learners join only through join_cohort(code); nobody can insert into cohort_learners directly.
--   * Institutions and their staff are created by the QADAM team in this SQL editor
--     with create_institution() and add_institution_staff() (not callable from the site).

create extension if not exists pgcrypto;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  city text not null default '' check (char_length(city) <= 60),
  created_at timestamptz not null default now()
);

create table if not exists public.institution_members (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (institution_id, user_id)
);

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  starts_on date,
  ends_on date,
  invite_code text not null unique default upper(encode(extensions.gen_random_bytes(5), 'hex')),
  created_by uuid default (auth.user_id())::uuid references neon_auth."user"(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cohort_learners (
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (cohort_id, user_id)
);

create table if not exists public.learner_progress (
  user_id uuid primary key default (auth.user_id())::uuid references neon_auth."user"(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  track text not null default '' check (char_length(track) <= 120),
  profile_completion int not null default 0 check (profile_completion between 0 and 100),
  updated_at timestamptz not null default now()
);

create table if not exists public.learner_activity (
  user_id uuid not null default (auth.user_id())::uuid references neon_auth."user"(id) on delete cascade,
  opportunity_id text not null check (char_length(opportunity_id) between 1 and 200),
  opportunity_title text not null default '' check (char_length(opportunity_title) <= 300),
  deadline text not null default '' check (char_length(deadline) <= 40),
  status text not null check (status in ('saved', 'preparing', 'applied')),
  updated_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

create index if not exists cohort_learners_user_idx on public.cohort_learners (user_id);
create index if not exists cohorts_institution_idx on public.cohorts (institution_id);

-- Helpers (security definer so policies can look across tables without recursion).
create or replace function public.is_institution_member(inst uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from institution_members where institution_id = inst and user_id = (auth.user_id())::uuid);
$$;

create or replace function public.is_cohort_staff(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cohorts co
    join institution_members m on m.institution_id = co.institution_id
    where co.id = c and m.user_id = (auth.user_id())::uuid
  );
$$;

create or replace function public.is_cohort_learner(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from cohort_learners where cohort_id = c and user_id = (auth.user_id())::uuid);
$$;

create or replace function public.staff_sees_learner(learner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cohort_learners cl
    join cohorts co on co.id = cl.cohort_id
    join institution_members m on m.institution_id = co.institution_id
    where cl.user_id = learner and m.user_id = (auth.user_id())::uuid
  );
$$;

alter table public.institutions enable row level security;
alter table public.institution_members enable row level security;
alter table public.cohorts enable row level security;
alter table public.cohort_learners enable row level security;
alter table public.learner_progress enable row level security;
alter table public.learner_activity enable row level security;

drop policy if exists "Members and learners read institutions" on public.institutions;
create policy "Members and learners read institutions" on public.institutions for select to authenticated
  using (
    public.is_institution_member(id)
    or exists (
      select 1 from public.cohorts co
      where co.institution_id = institutions.id and public.is_cohort_learner(co.id)
    )
  );

drop policy if exists "Members read their institution staff" on public.institution_members;
create policy "Members read their institution staff" on public.institution_members for select to authenticated
  using (user_id = (auth.user_id())::uuid or public.is_institution_member(institution_id));

drop policy if exists "Staff and learners read cohorts" on public.cohorts;
create policy "Staff and learners read cohorts" on public.cohorts for select to authenticated
  using (public.is_institution_member(institution_id) or public.is_cohort_learner(id));
drop policy if exists "Staff create cohorts" on public.cohorts;
create policy "Staff create cohorts" on public.cohorts for insert to authenticated
  with check (public.is_institution_member(institution_id));
drop policy if exists "Staff update cohorts" on public.cohorts;
create policy "Staff update cohorts" on public.cohorts for update to authenticated
  using (public.is_institution_member(institution_id)) with check (public.is_institution_member(institution_id));
drop policy if exists "Staff delete cohorts" on public.cohorts;
create policy "Staff delete cohorts" on public.cohorts for delete to authenticated
  using (public.is_institution_member(institution_id));

drop policy if exists "Learner or staff read membership" on public.cohort_learners;
create policy "Learner or staff read membership" on public.cohort_learners for select to authenticated
  using (user_id = (auth.user_id())::uuid or public.is_cohort_staff(cohort_id));
drop policy if exists "Staff remove learners" on public.cohort_learners;
create policy "Staff remove learners" on public.cohort_learners for delete to authenticated
  using (public.is_cohort_staff(cohort_id));

drop policy if exists "Own or staff read progress" on public.learner_progress;
create policy "Own or staff read progress" on public.learner_progress for select to authenticated
  using (user_id = (auth.user_id())::uuid or public.staff_sees_learner(user_id));
drop policy if exists "Learner writes own progress" on public.learner_progress;
create policy "Learner writes own progress" on public.learner_progress for insert to authenticated
  with check (user_id = (auth.user_id())::uuid);
drop policy if exists "Learner updates own progress" on public.learner_progress;
create policy "Learner updates own progress" on public.learner_progress for update to authenticated
  using (user_id = (auth.user_id())::uuid) with check (user_id = (auth.user_id())::uuid);

drop policy if exists "Own or staff read activity" on public.learner_activity;
create policy "Own or staff read activity" on public.learner_activity for select to authenticated
  using (user_id = (auth.user_id())::uuid or public.staff_sees_learner(user_id));
drop policy if exists "Learner writes own activity" on public.learner_activity;
create policy "Learner writes own activity" on public.learner_activity for insert to authenticated
  with check (user_id = (auth.user_id())::uuid);
drop policy if exists "Learner updates own activity" on public.learner_activity;
create policy "Learner updates own activity" on public.learner_activity for update to authenticated
  using (user_id = (auth.user_id())::uuid) with check (user_id = (auth.user_id())::uuid);
drop policy if exists "Learner deletes own activity" on public.learner_activity;
create policy "Learner deletes own activity" on public.learner_activity for delete to authenticated
  using (user_id = (auth.user_id())::uuid);

revoke all on public.institutions, public.institution_members, public.cohorts, public.cohort_learners,
  public.learner_progress, public.learner_activity from anonymous;
grant select on public.institutions, public.institution_members to authenticated;
grant select, insert, update, delete on public.cohorts to authenticated;
grant select, delete on public.cohort_learners to authenticated;
grant select, insert, update on public.learner_progress to authenticated;
grant select, insert, update, delete on public.learner_activity to authenticated;

-- Public: what does this invite code open? (Shown before the learner signs in.)
create or replace function public.cohort_invite_info(code text)
returns table (cohort_name text, institution_name text)
language sql stable security definer set search_path = public as $$
  select co.name, i.name from cohorts co join institutions i on i.id = co.institution_id
  where co.invite_code = upper(trim(code))
    and (co.ends_on is null or co.ends_on >= current_date);
$$;

-- Signed-in learner joins the cohort behind an invite code.
create or replace function public.join_cohort(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if (auth.user_id())::uuid is null then raise exception 'Sign in first'; end if;
  select id into target from cohorts
  where invite_code = upper(trim(code)) and (ends_on is null or ends_on >= current_date);
  if target is null then raise exception 'This invite code is not valid or has expired'; end if;
  insert into cohort_learners (cohort_id, user_id) values (target, (auth.user_id())::uuid) on conflict do nothing;
  return target;
end;
$$;

-- Staff roster for one cohort, with learner email and activity counts.
create or replace function public.cohort_roster(c uuid)
returns table (
  user_id uuid, email text, full_name text, track text, profile_completion int,
  saved int, preparing int, applied int, next_deadline text, joined_at timestamptz, last_active timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_cohort_staff(c) then raise exception 'Not staff of this cohort'; end if;
  return query
  select cl.user_id, u.email::text, coalesce(p.full_name, ''), coalesce(p.track, ''), coalesce(p.profile_completion, 0),
    (select count(*)::int from learner_activity a where a.user_id = cl.user_id and a.status = 'saved'),
    (select count(*)::int from learner_activity a where a.user_id = cl.user_id and a.status = 'preparing'),
    (select count(*)::int from learner_activity a where a.user_id = cl.user_id and a.status = 'applied'),
    (select min(a.deadline) from learner_activity a
       where a.user_id = cl.user_id and a.status <> 'applied' and a.deadline >= to_char(current_date, 'YYYY-MM-DD')),
    cl.joined_at,
    greatest(p.updated_at, (select max(a.updated_at) from learner_activity a where a.user_id = cl.user_id))
  from cohort_learners cl
  join neon_auth."user" u on u.id = cl.user_id
  left join learner_progress p on p.user_id = cl.user_id
  where cl.cohort_id = c
  order by coalesce(p.full_name, u.email::text);
end;
$$;

revoke execute on function public.cohort_invite_info(text), public.join_cohort(text), public.cohort_roster(uuid) from public;
grant execute on function public.cohort_invite_info(text) to anonymous, authenticated;
grant execute on function public.join_cohort(text), public.cohort_roster(uuid) to authenticated;

-- Admin only (run in the SQL editor). The staff member must have signed in once at /staff.
create or replace function public.create_institution(p_name text, p_city text, p_staff_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inst uuid; staff uuid;
begin
  select id into staff from neon_auth."user" where lower(email) = lower(trim(p_staff_email));
  if staff is null then raise exception 'No account for %. Ask them to sign in once at /staff first.', p_staff_email; end if;
  insert into institutions (name, city) values (trim(p_name), trim(coalesce(p_city, ''))) returning id into inst;
  insert into institution_members (institution_id, user_id, role) values (inst, staff, 'owner');
  return inst;
end;
$$;

create or replace function public.add_institution_staff(p_institution uuid, p_staff_email text)
returns void language plpgsql security definer set search_path = public as $$
declare staff uuid;
begin
  select id into staff from neon_auth."user" where lower(email) = lower(trim(p_staff_email));
  if staff is null then raise exception 'No account for %. Ask them to sign in once at /staff first.', p_staff_email; end if;
  insert into institution_members (institution_id, user_id, role) values (p_institution, staff, 'staff') on conflict do nothing;
end;
$$;

revoke execute on function public.create_institution(text, text, text), public.add_institution_staff(uuid, text)
  from public, anonymous, authenticated;
revoke execute on function public.is_institution_member(uuid), public.is_cohort_staff(uuid),
  public.is_cohort_learner(uuid), public.staff_sees_learner(uuid) from public, anonymous;
grant execute on function public.is_institution_member(uuid), public.is_cohort_staff(uuid),
  public.is_cohort_learner(uuid), public.staff_sees_learner(uuid) to authenticated;
