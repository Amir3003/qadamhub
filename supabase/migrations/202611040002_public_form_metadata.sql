-- Public forms may submit content, but server-generated metadata is not writable.
revoke insert on public.pilot_requests from anon, authenticated;
grant insert (institution, contact_name, role, email, phone, city, cohort_size, message)
  on public.pilot_requests to anon, authenticated;

revoke insert on public.opportunity_suggestions from anon, authenticated;
grant insert (title, url, type, deadline, note)
  on public.opportunity_suggestions to anon, authenticated;
