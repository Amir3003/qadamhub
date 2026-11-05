-- Generated for an empty Neon staging database; see scripts/make-neon-migrations.py.
-- In-app beta feedback (Feedback button). Written only by POST /api/beta-feedback with the
-- service role key, so the table has row level security and no policies: browsers cannot
-- read or write it. Read the reports in the Supabase Table Editor and set `status`.
-- Run by hand in the SQL editor, after the earlier migrations.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('bug', 'feature', 'general')),
  description text not null check (char_length(description) between 10 and 2000),
  -- Self-reported by the browser when the person is signed in to the network. For triage
  -- only, never used for authorization.
  user_id uuid,
  page_path text not null default '/' check (char_length(page_path) <= 200 and page_path like '/%'),
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  status text not null default 'new' check (status in ('new', 'triaged', 'done', 'wontfix'))
);

alter table public.feedback enable row level security;
revoke all on public.feedback from anonymous, authenticated;

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
