-- Generated for an empty Neon staging database; see scripts/make-neon-migrations.py.
-- Run once in the Supabase SQL editor after 202610180001_network.sql.
-- Social network: open discovery, friend requests, online presence and adding friends to groups.

-- New profiles are discoverable by default; users can still hide theirs.
alter table public.network_profiles alter column is_public set default true;
alter table public.network_profiles add column if not exists last_seen_at timestamptz;

create table public.network_friend_requests (
  sender_id uuid not null references public.network_profiles(id) on delete cascade,
  recipient_id uuid not null references public.network_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (sender_id, recipient_id),
  check (sender_id <> recipient_id)
);
create index network_friend_requests_recipient on public.network_friend_requests(recipient_id);
alter table public.network_friend_requests enable row level security;
revoke all on public.network_friend_requests from anonymous, authenticated;
grant select on public.network_friend_requests to authenticated;
create policy request_read on public.network_friend_requests for select to authenticated
  using ((auth.user_id())::uuid in (sender_id, recipient_id));

create function qadam_private.has_request_with(other uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.network_friend_requests
   where (sender_id=(auth.user_id())::uuid and recipient_id=other) or (sender_id=other and recipient_id=(auth.user_id())::uuid));
$$;
revoke all on function qadam_private.has_request_with(uuid) from public;
grant execute on function qadam_private.has_request_with(uuid) to authenticated;

-- Someone who sent you a request stays visible to you even if their profile is hidden.
drop policy profile_read on public.network_profiles;
create policy profile_read on public.network_profiles for select to authenticated using
 (id=(auth.user_id())::uuid or is_public or qadam_private.is_connected(id) or qadam_private.shares_team(id) or qadam_private.has_request_with(id));

create function public.network_send_friend_request(target uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
 if (auth.user_id())::uuid is null or not exists(select 1 from public.network_profiles where id=(auth.user_id())::uuid) then raise exception 'Save your network profile first'; end if;
 if target = (auth.user_id())::uuid then raise exception 'You cannot add yourself'; end if;
 if not exists(select 1 from public.network_profiles where id=target and (is_public or qadam_private.shares_team(target) or qadam_private.has_request_with(target))) then
  raise exception 'Profile not found';
 end if;
 if qadam_private.is_connected(target) then return 'already'; end if;
 -- They already asked you: accepting is the same as sending back.
 if exists(select 1 from public.network_friend_requests where sender_id=target and recipient_id=(auth.user_id())::uuid) then
  insert into public.network_connections values(least((auth.user_id())::uuid,target),greatest((auth.user_id())::uuid,target)) on conflict do nothing;
  delete from public.network_friend_requests where (sender_id=target and recipient_id=(auth.user_id())::uuid) or (sender_id=(auth.user_id())::uuid and recipient_id=target);
  return 'connected';
 end if;
 perform pg_advisory_xact_lock(hashtext('requests:' || (auth.user_id())::uuid::text));
 if (select count(*) from public.network_friend_requests where sender_id=(auth.user_id())::uuid and created_at > now()-interval '1 hour') >= 50 then
  raise exception 'Request limit reached. Try again later.';
 end if;
 insert into public.network_friend_requests(sender_id,recipient_id) values((auth.user_id())::uuid,target) on conflict do nothing;
 return 'requested';
end; $$;

create function public.network_respond_friend_request(requester uuid, accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if (auth.user_id())::uuid is null then raise exception 'Sign in first'; end if;
 delete from public.network_friend_requests where sender_id=requester and recipient_id=(auth.user_id())::uuid;
 if not found then raise exception 'Request not found'; end if;
 if accept then
  insert into public.network_connections values(least((auth.user_id())::uuid,requester),greatest((auth.user_id())::uuid,requester)) on conflict do nothing;
 end if;
end; $$;

create function public.network_cancel_friend_request(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if (auth.user_id())::uuid is null then raise exception 'Sign in first'; end if;
 delete from public.network_friend_requests where sender_id=(auth.user_id())::uuid and recipient_id=target;
end; $$;

create function public.network_heartbeat() returns void
language sql security definer set search_path = '' as $$
 update public.network_profiles set last_seen_at=now() where id=(auth.user_id())::uuid;
$$;

-- Group owners add their friends directly, without an invite link.
create function public.network_add_team_member(target_team uuid, member uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if (auth.user_id())::uuid is null then raise exception 'Sign in first'; end if;
 if not exists(select 1 from public.network_teams where id=target_team and owner_id=(auth.user_id())::uuid) then raise exception 'Only the group owner can add members'; end if;
 if not qadam_private.is_connected(member) then raise exception 'You can only add your friends'; end if;
 perform 1 from public.network_teams where id=target_team for update;
 if (select count(*) from public.network_members where team_id=target_team) >= 30 then raise exception 'Group is full'; end if;
 insert into public.network_members values(target_team,member) on conflict do nothing;
end; $$;

revoke all on function public.network_send_friend_request(uuid), public.network_respond_friend_request(uuid,boolean), public.network_cancel_friend_request(uuid), public.network_heartbeat(), public.network_add_team_member(uuid,uuid) from public, anonymous;
grant execute on function public.network_send_friend_request(uuid), public.network_respond_friend_request(uuid,boolean), public.network_cancel_friend_request(uuid), public.network_heartbeat(), public.network_add_team_member(uuid,uuid) to authenticated;
