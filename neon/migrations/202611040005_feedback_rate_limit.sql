-- Apply together with the updated feedback API and a restricted execute-only role.
create or replace function qadam_private.submit_feedback(p_client_key text, p_data jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if p_client_key is null or p_client_key !~ '^[a-f0-9]{64}$' or p_data is null then
    raise exception 'Invalid feedback submission';
  end if;
  insert into qadam_private.form_rate_limits(kind, client_key, window_started, attempts)
  values ('feedback', p_client_key, now(), 1)
  on conflict (kind, client_key) do update set
    attempts = case when qadam_private.form_rate_limits.window_started < now() - interval '1 hour'
                    then 1 else qadam_private.form_rate_limits.attempts + 1 end,
    window_started = case when qadam_private.form_rate_limits.window_started < now() - interval '1 hour'
                          then now() else qadam_private.form_rate_limits.window_started end
  returning attempts into n;
  if n > 8 then return false; end if;
  if random() < 0.01 then
    delete from qadam_private.form_rate_limits where window_started < now() - interval '2 hours';
  end if;
  insert into public.feedback(type, description, rating, user_id, page_path, user_agent)
  values (p_data->>'type', p_data->>'description', nullif(p_data->>'rating', '')::smallint,
          nullif(p_data->>'user_id', '')::uuid, p_data->>'page_path', p_data->>'user_agent');
  return true;
end; $$;
revoke all on function qadam_private.submit_feedback(text,jsonb) from public, anonymous, authenticated;
