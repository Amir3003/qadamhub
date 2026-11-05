-- Generated for an empty Neon staging database; see scripts/make-neon-migrations.py.
-- Star ratings in the same table as feedback: type 'rating' with a 1 to 5 `rating` and an
-- optional comment. Run by hand in the SQL editor, after 202610310001_feedback.sql.

alter table public.feedback add column if not exists rating smallint check (rating between 1 and 5);

alter table public.feedback drop constraint if exists feedback_type_check;
alter table public.feedback
  add constraint feedback_type_check check (type in ('bug', 'feature', 'general', 'rating'));

alter table public.feedback drop constraint if exists feedback_description_check;
alter table public.feedback
  add constraint feedback_description_check check (
    char_length(description) <= 2000
    and (type = 'rating' or char_length(description) >= 10)
  );

-- A rating row always has stars, and only rating rows have them.
alter table public.feedback drop constraint if exists feedback_rating_matches_type;
alter table public.feedback
  add constraint feedback_rating_matches_type check ((type = 'rating') = (rating is not null));
