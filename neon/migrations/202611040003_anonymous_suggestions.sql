-- Neon anonymous JWTs use the literal subject 'anonymous', not a UUID.
alter table public.opportunity_suggestions
  alter column submitted_by set default nullif(auth.user_id(), 'anonymous')::uuid;
drop policy if exists "Anyone can suggest an opportunity" on public.opportunity_suggestions;
create policy "Anyone can suggest an opportunity" on public.opportunity_suggestions
  for insert to anonymous, authenticated
  with check (status = 'new' and
    (submitted_by is null or submitted_by = nullif(auth.user_id(), 'anonymous')::uuid));
