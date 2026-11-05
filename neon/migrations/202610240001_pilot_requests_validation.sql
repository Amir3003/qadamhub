-- Generated for an empty Neon staging database; see scripts/make-neon-migrations.py.
-- Stricter checks for pilot requests, matching src/lib/pilotValidation.ts.
-- The form already validates; these checks stop junk sent around the form.
-- NOT VALID: rows saved before this migration are kept as they are.

alter table public.pilot_requests
  drop constraint if exists pilot_requests_role_allowed,
  drop constraint if exists pilot_requests_cohort_size_allowed,
  drop constraint if exists pilot_requests_email_format,
  drop constraint if exists pilot_requests_phone_format,
  drop constraint if exists pilot_requests_city_format,
  drop constraint if exists pilot_requests_names_have_letters,
  drop constraint if exists pilot_requests_message_format;

alter table public.pilot_requests
  add constraint pilot_requests_role_allowed
    check (role in ('Director', 'Program lead', 'Career staff', 'Other')) not valid,
  add constraint pilot_requests_cohort_size_allowed
    check (cohort_size in ('Under 30', '30 to 50', '50 to 100', 'Over 100')) not valid,
  add constraint pilot_requests_email_format
    check (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}$') not valid,
  add constraint pilot_requests_phone_format
    check (
      phone = ''
      or phone ~ '^@[A-Za-z0-9_]{5,32}$'
      or (
        phone ~ '^\+?[0-9 ()-]+$'
        and length(regexp_replace(phone, '\D', '', 'g')) between 10 and 15
        and regexp_replace(phone, '\D', '', 'g') !~ '^(\d)\1+$'
      )
    ) not valid,
  add constraint pilot_requests_city_format
    check (char_length(city) between 2 and 60 and city ~ '[[:alpha:]]' and city !~ '[0-9]') not valid,
  add constraint pilot_requests_names_have_letters
    check (institution ~ '[[:alpha:]]' and contact_name ~ '[[:alpha:]]' and contact_name !~ '[0-9]') not valid,
  add constraint pilot_requests_message_format
    check (message = '' or (char_length(message) >= 10 and message ~ '\s')) not valid;
