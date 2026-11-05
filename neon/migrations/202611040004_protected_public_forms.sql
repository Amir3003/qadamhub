-- Apply only together with the server-side form endpoints and their credentials.
-- Direct Data API inserts are revoked so clients cannot bypass the limiter.
revoke insert (institution, contact_name, role, email, phone, city, cohort_size, message)
  on public.pilot_requests from anonymous, authenticated;
revoke insert (title, url, type, deadline, note)
  on public.opportunity_suggestions from anonymous, authenticated;
revoke insert on public.pilot_requests, public.opportunity_suggestions from anonymous, authenticated;

create table if not exists qadam_private.form_rate_limits (
  kind text not null,
  client_key text not null,
  window_started timestamptz not null,
  attempts integer not null,
  primary key (kind, client_key)
);
revoke all on qadam_private.form_rate_limits from public, anonymous, authenticated;

create or replace function qadam_private.submit_public_form(p_kind text, p_client_key text, p_data jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if p_kind is null or p_kind not in ('pilot', 'suggestion') or p_client_key is null or p_client_key !~ '^[a-f0-9]{64}$' or p_data is null then
    raise exception 'Invalid submission';
  end if;
  insert into qadam_private.form_rate_limits(kind,client_key,window_started,attempts)
  values (p_kind,p_client_key,now(),1)
  on conflict (kind,client_key) do update set
    attempts = case when qadam_private.form_rate_limits.window_started < now() - interval '1 hour'
                    then 1 else qadam_private.form_rate_limits.attempts + 1 end,
    window_started = case when qadam_private.form_rate_limits.window_started < now() - interval '1 hour'
                          then now() else qadam_private.form_rate_limits.window_started end
  returning attempts into n;
  if n > 5 then return false; end if;
  if random() < 0.01 then
    delete from qadam_private.form_rate_limits where window_started < now() - interval '2 hours';
  end if;
  if p_kind = 'pilot' then
    insert into public.pilot_requests(institution,contact_name,role,email,phone,city,cohort_size,message)
    values(p_data->>'institution',p_data->>'contact_name',p_data->>'role',p_data->>'email',
      p_data->>'phone',p_data->>'city',p_data->>'cohort_size',p_data->>'message');
  else
    insert into public.opportunity_suggestions(title,url,type,deadline,note,submitted_by)
    values(p_data->>'title',p_data->>'url',p_data->>'type',nullif(p_data->>'deadline','')::date,p_data->>'note',null);
  end if;
  return true;
end; $$;
revoke all on function qadam_private.submit_public_form(text,text,jsonb) from public, anonymous, authenticated;
