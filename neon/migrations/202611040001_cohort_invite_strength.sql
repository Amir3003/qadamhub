-- Generated for an empty Neon staging database; see scripts/make-neon-migrations.py.
-- New cohort invitations use 96 bits of randomness. Existing codes remain valid.
-- 24 hexadecimal characters fit the student form's existing input limit.
alter table public.cohorts
  alter column invite_code set default upper(encode(extensions.gen_random_bytes(12), 'hex'));
