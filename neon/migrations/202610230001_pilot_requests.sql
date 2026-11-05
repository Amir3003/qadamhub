-- Generated for an empty Neon staging database; see scripts/make-neon-migrations.py.
-- Pilot requests from the public B2B landing.
-- Anyone can submit a request; nobody can read requests through the API.
-- Read them in the Supabase dashboard (Table Editor, pilot_requests).

create table if not exists public.pilot_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  institution text not null check (char_length(institution) between 2 and 160),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  role text not null default '' check (char_length(role) <= 60),
  email text not null check (char_length(email) between 5 and 200 and email like '%_@_%._%'),
  phone text not null default '' check (char_length(phone) <= 60),
  city text not null default '' check (char_length(city) <= 60),
  cohort_size text not null default '' check (char_length(cohort_size) <= 30),
  message text not null default '' check (char_length(message) <= 1000)
);

alter table public.pilot_requests enable row level security;

drop policy if exists "Anyone can submit a pilot request" on public.pilot_requests;
create policy "Anyone can submit a pilot request"
  on public.pilot_requests
  for insert
  to anonymous, authenticated
  with check (true);

revoke select, update, delete on public.pilot_requests from anonymous, authenticated;
grant insert on public.pilot_requests to anonymous, authenticated;
