-- Generated for an empty Neon staging database; see scripts/make-neon-migrations.py.
-- Run once in a new Supabase project's SQL editor. All network identity comes from Auth.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to authenticated;
create schema if not exists qadam_private;
revoke all on schema qadam_private from public;
grant usage on schema qadam_private to authenticated;

create table public.network_profiles (
  id uuid primary key references neon_auth."user"(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  role text not null default 'Student / Learner' check (char_length(role) <= 100),
  university text not null default '' check (char_length(university) <= 160),
  location text not null default '' check (char_length(location) <= 120),
  bio text not null default '' check (char_length(bio) <= 1000),
  skills text[] not null default '{}' check (cardinality(skills) <= 30 and octet_length(skills::text) <= 3000),
  goals text[] not null default '{}' check (cardinality(goals) <= 20 and octet_length(goals::text) <= 3000),
  is_public boolean not null default false
);
create table public.network_connections (
  user_a uuid not null references public.network_profiles(id) on delete cascade,
  user_b uuid not null references public.network_profiles(id) on delete cascade,
  primary key(user_a, user_b), check (user_a < user_b)
);
create table public.network_teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.network_profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  opportunity_title text not null default '' check (char_length(opportunity_title) <= 200),
  created_at timestamptz not null default now()
);
create table public.network_members (
  team_id uuid not null references public.network_teams(id) on delete cascade,
  user_id uuid not null references public.network_profiles(id) on delete cascade,
  primary key(team_id, user_id)
);
create table public.network_invites (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.network_profiles(id) on delete cascade,
  team_id uuid references public.network_teams(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null default now() + interval '7 days',
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.network_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.network_profiles(id) on delete cascade,
  recipient_id uuid references public.network_profiles(id) on delete cascade,
  team_id uuid references public.network_teams(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (num_nonnulls(recipient_id, team_id) = 1),
  check (recipient_id is null or recipient_id <> sender_id)
);
create index network_messages_team on public.network_messages(team_id, created_at desc);
create index network_messages_sender on public.network_messages(sender_id, created_at desc);
create index network_messages_recipient on public.network_messages(recipient_id, created_at desc);
create index network_members_user on public.network_members(user_id);
create index network_connections_b on public.network_connections(user_b);

create function qadam_private.is_member(t uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.network_members where team_id=t and user_id=(auth.user_id())::uuid);
$$;
create function qadam_private.is_connected(other uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.network_connections where user_a=least((auth.user_id())::uuid,other) and user_b=greatest((auth.user_id())::uuid,other));
$$;
create function qadam_private.shares_team(other uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.network_members a join public.network_members b using(team_id) where a.user_id=(auth.user_id())::uuid and b.user_id=other);
$$;
revoke all on all functions in schema qadam_private from public;
grant execute on all functions in schema qadam_private to authenticated;

alter table public.network_profiles enable row level security;
alter table public.network_connections enable row level security;
alter table public.network_teams enable row level security;
alter table public.network_members enable row level security;
alter table public.network_invites enable row level security;
alter table public.network_messages enable row level security;
-- Explicit grants: anonymous clients cannot access any table, even if a project has broad defaults.
revoke all on public.network_profiles, public.network_connections, public.network_teams, public.network_members, public.network_invites, public.network_messages from anonymous, authenticated;
grant select, insert, update, delete on public.network_profiles to authenticated;
grant select, delete on public.network_connections to authenticated;
grant select on public.network_teams, public.network_members to authenticated;
grant select, insert on public.network_messages to authenticated;

create policy profile_read on public.network_profiles for select to authenticated using
 (id=(auth.user_id())::uuid or is_public or qadam_private.is_connected(id) or qadam_private.shares_team(id));
create policy profile_create on public.network_profiles for insert to authenticated with check(id=(auth.user_id())::uuid);
create policy profile_edit on public.network_profiles for update to authenticated using(id=(auth.user_id())::uuid) with check(id=(auth.user_id())::uuid);
create policy profile_delete on public.network_profiles for delete to authenticated using(id=(auth.user_id())::uuid);
create policy connection_read on public.network_connections for select to authenticated using((auth.user_id())::uuid in (user_a,user_b));
create policy connection_remove on public.network_connections for delete to authenticated using((auth.user_id())::uuid in (user_a,user_b));
create policy team_read on public.network_teams for select to authenticated using(qadam_private.is_member(id));
create policy member_read on public.network_members for select to authenticated using(qadam_private.is_member(team_id));
create policy message_read on public.network_messages for select to authenticated using
 ((recipient_id is not null and (auth.user_id())::uuid in (sender_id,recipient_id)) or (team_id is not null and qadam_private.is_member(team_id)));
create policy message_send on public.network_messages for insert to authenticated with check
 (sender_id=(auth.user_id())::uuid and ((recipient_id is not null and qadam_private.is_connected(recipient_id)) or (team_id is not null and qadam_private.is_member(team_id))));

create function public.network_create_team(team_name text, opportunity text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare t uuid;
begin
 if (auth.user_id())::uuid is null then raise exception 'Sign in first'; end if;
 perform pg_advisory_xact_lock(hashtext('teams:' || (auth.user_id())::uuid::text));
 if (select count(*) from public.network_teams where owner_id=(auth.user_id())::uuid) >= 20 then raise exception 'Team limit reached'; end if;
 insert into public.network_teams(owner_id,name,opportunity_title) values((auth.user_id())::uuid,trim(team_name),opportunity) returning id into t;
 insert into public.network_members values(t,(auth.user_id())::uuid);
 return t;
end; $$;
create function public.network_create_invite(target_team uuid default null) returns text
language plpgsql security definer set search_path = '' as $$
declare token text;
begin
 if (auth.user_id())::uuid is null or not exists(select 1 from public.network_profiles where id=(auth.user_id())::uuid) then raise exception 'Save your network profile first'; end if;
 if target_team is not null and not exists(select 1 from public.network_teams where id=target_team and owner_id=(auth.user_id())::uuid) then raise exception 'Only the team owner can invite members'; end if;
 perform pg_advisory_xact_lock(hashtext('invites:' || (auth.user_id())::uuid::text));
 if (select count(*) from public.network_invites where creator_id=(auth.user_id())::uuid and created_at > now()-interval '1 hour') >= 20 then raise exception 'Invite limit reached. Try again later.'; end if;
 token := encode(extensions.gen_random_bytes(32),'hex');
 insert into public.network_invites(creator_id,team_id,token_hash) values((auth.user_id())::uuid,target_team,encode(extensions.digest(token,'sha256'),'hex'));
 return token;
end; $$;
create function public.network_preview_invite(invite_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if char_length(invite_code) <> 64 then raise exception 'Invalid invitation'; end if;
 select jsonb_build_object('creator',p.name,'team',t.name,'expires_at',i.expires_at) into result
 from public.network_invites i join public.network_profiles p on p.id=i.creator_id left join public.network_teams t on t.id=i.team_id
 where i.token_hash=encode(extensions.digest(invite_code,'sha256'),'hex') and not i.revoked and i.expires_at>now();
 if result is null then raise exception 'Invitation is invalid or expired'; end if;
 return result;
end; $$;
create function public.network_accept_invite(invite_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare i public.network_invites; tname text;
begin
 if (auth.user_id())::uuid is null or not exists(select 1 from public.network_profiles where id=(auth.user_id())::uuid) then raise exception 'Save your network profile first'; end if;
 if char_length(invite_code) <> 64 then raise exception 'Invalid invitation'; end if;
 select * into i from public.network_invites where token_hash=encode(extensions.digest(invite_code,'sha256'),'hex') and not revoked and expires_at>now() for update;
 if i.id is null then raise exception 'Invitation is invalid or expired'; end if;
 if i.creator_id=(auth.user_id())::uuid then raise exception 'Open this invitation from another account'; end if;
 if i.team_id is null then
  insert into public.network_connections values(least((auth.user_id())::uuid,i.creator_id),greatest((auth.user_id())::uuid,i.creator_id)) on conflict do nothing;
 else
  perform 1 from public.network_teams where id=i.team_id for update;
  if (select count(*) from public.network_members where team_id=i.team_id) >= 30 and not exists(select 1 from public.network_members where team_id=i.team_id and user_id=(auth.user_id())::uuid) then raise exception 'Team is full'; end if;
  insert into public.network_members values(i.team_id,(auth.user_id())::uuid) on conflict do nothing;
  select name into tname from public.network_teams where id=i.team_id;
 end if;
 return jsonb_build_object('team_id',i.team_id,'team_name',tname,'connected_to',i.creator_id);
end; $$;
create function public.network_revoke_invites(target_team uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if (auth.user_id())::uuid is null then raise exception 'Sign in first'; end if;
 update public.network_invites set revoked=true where creator_id=(auth.user_id())::uuid and team_id is not distinct from target_team;
end; $$;
create function public.network_leave_team(target_team uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if (auth.user_id())::uuid is null then raise exception 'Sign in first'; end if;
 if exists(select 1 from public.network_teams where id=target_team and owner_id=(auth.user_id())::uuid) then
  delete from public.network_teams where id=target_team and owner_id=(auth.user_id())::uuid;
 else
  delete from public.network_members where team_id=target_team and user_id=(auth.user_id())::uuid;
 end if;
end; $$;
-- A database-side throttle prevents bypassing the UI's send button.
create function qadam_private.throttle_message() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 perform pg_advisory_xact_lock(hashtext(new.sender_id::text));
 if exists(select 1 from public.network_messages where sender_id=new.sender_id and created_at>now()-interval '1 second') then raise exception 'Please wait a second before sending another message'; end if;
 new.created_at := now();
 return new;
end; $$;
create trigger network_message_throttle before insert on public.network_messages for each row execute function qadam_private.throttle_message();
revoke all on function qadam_private.throttle_message() from public;
revoke all on function public.network_create_team(text,text), public.network_create_invite(uuid), public.network_preview_invite(text), public.network_accept_invite(text), public.network_revoke_invites(uuid), public.network_leave_team(uuid) from public, anonymous;
grant execute on function public.network_create_team(text,text), public.network_create_invite(uuid), public.network_preview_invite(text), public.network_accept_invite(text), public.network_revoke_invites(uuid), public.network_leave_team(uuid) to authenticated;
