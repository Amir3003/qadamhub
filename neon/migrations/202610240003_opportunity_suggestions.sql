-- Generated for an empty Neon staging database; see scripts/make-neon-migrations.py.
-- Opportunity suggestions from learners (a hackathon, grant or internship they saw elsewhere).
-- Run by hand in the Supabase SQL editor. Anyone can suggest; nobody can read through the API.
-- Read suggestions in the Table Editor (opportunity_suggestions) and set status to 'added' or 'rejected'.

create table if not exists public.opportunity_suggestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 3 and 200),
  url text not null check (url ~ '^https?://' and char_length(url) <= 500),
  type text not null default 'other' check (type in ('hackathon', 'grant', 'internship', 'other')),
  deadline date null,
  note text not null default '' check (char_length(note) <= 500),
  submitted_by uuid null default (auth.user_id())::uuid references neon_auth."user"(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'added', 'rejected'))
);

alter table public.opportunity_suggestions enable row level security;

drop policy if exists "Anyone can suggest an opportunity" on public.opportunity_suggestions;
create policy "Anyone can suggest an opportunity"
  on public.opportunity_suggestions
  for insert
  to anonymous, authenticated
  with check (status = 'new' and (submitted_by is null or submitted_by = (auth.user_id())::uuid));

revoke select, update, delete on public.opportunity_suggestions from anonymous, authenticated;
grant insert on public.opportunity_suggestions to anonymous, authenticated;
