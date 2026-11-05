# Neon staging integration

This branch targets a new, empty Neon database; it does not migrate existing Supabase users or data. Do not deploy it to production until email sign-in, permissions and all workflows have been tested end-to-end.

## Configuration

Set `VITE_NEON_URL` to the staging database HTTPS base URL, without credentials or query parameters. The Neon SDK derives Auth and Data API endpoints. When unset, the application retains its existing Supabase configuration. Configure the exact Neon Auth and Data API hosts in the deployed Content Security Policy.

For feedback, set the server-only `NEON_DATABASE_URL` to a TLS-enabled Postgres connection string. Do not put this value in a Vite variable or commit it. When Neon is selected but this setting is missing, feedback returns 503 instead of writing to the old Supabase project. Prefer a narrowly scoped database role for feedback. Local Vite does not serve the Vercel functions: test feedback in a matching Vercel preview or a local function runtime.

## Database setup

Enable Neon Auth and Data API without automatic broad public-schema grants. Apply the SQL files in `neon/migrations/` in order to a new test database, then refresh the Data API schema cache. These files are generated from the checked-in Supabase migrations by `python scripts/make-neon-migrations.py`; review generated changes before applying them. The first migration is not safe to rerun against a populated schema. The database policies depend on a verified Neon Auth JWT and `auth.user_id()`; do not substitute a client-supplied identifier.

The default PostgreSQL extension is installed in the `extensions` schema. Authenticated users need schema usage for the cohort invite code default. The feedback table has RLS and no public policies, and the feedback API must use a server-side database credential.

## Required tests before any cutover

- Run `npm run build`, `npm run test:network`, `npm run test:feedback`, and `node --test tests/neon-*.test.mjs`.
- Test email OTP with a real mailbox and verify sign-in persists after reload; configure a reliable production email sender and the exact allowed production origin.
- Test two signed-in accounts and one outsider: profiles, invitation acceptance, DMs, group chat, friend requests, and denial of access to another user's private data.
- Test staff cohort creation, joining, roster and removal; test public requests, feedback and data requests in the preview.
- Verify that no confidential data is exposed through Data API and that migrations, backups and restore procedures work.
- Decide how to deploy, configure preview and production environments independently, and retain a tested rollback path.

## Security findings from staging verification

- Enable Neon Auth **Verify at Sign-up**: without it, email/password sign-ups obtain sessions for unverified addresses. It is enabled in the current staging project. Existing unverified sessions issued before that change are not automatically revoked; handle them before any launch and re-test the OTP flow after configuration changes.
- The branch now routes pilot and opportunity forms through `/api/public-form`, with a shared database-backed limit of five submissions per IP and form per hour. The client IP is stored only as an HMAC. This is not protection against distributed abuse; add edge/WAF controls when deployment access is available.
- Migration `202611040004_protected_public_forms.sql` revokes direct Data API inserts. It was applied to the current `qadam-staging` database on 4 November 2026 after the local API was configured. Older test frontends that write directly no longer submit these forms. For any other environment, configure the API and credentials before applying this migration and switch the frontend/API together.
- Set `NEON_FORMS_DATABASE_URL` to a server-only connection using a restricted role; grant that role `USAGE` on `qadam_private` and `EXECUTE` on `qadam_private.submit_public_form(text,text,jsonb)` only. Configure a separate random `FORMS_IP_HASH_SECRET` of at least 32 characters. Never expose either as `VITE_` variables. Set up independently for staging and production.
- Feedback and data-request endpoints still use per-instance in-memory limits; use a shared limiter or edge/WAF rules for stronger protection before launch.
- Cohort invites created after migration `202611040001` have 96 bits of randomness. Earlier codes remain valid and keep their previous strength; rotate them deliberately if needed.
- Migration `202611040003` is Neon-specific: anonymous tokens use the literal subject `anonymous`, which must not be cast directly to UUID.
- The site's contact address and feedback email fallback currently point to the original developer's address in `src/lib/pilotRequests.ts`; confirm the owner's intended contact before release.

## Local test without Vercel

Run `node scripts/local-public-form.mjs` and open the one-time setup URL it prints. Enter the TLS connection string for `qadam-staging`; it stays in that process's memory and the listener binds to localhost only. Run Vite separately with `QADAM_LOCAL_FORM_API=1` and the staging `VITE_NEON_URL`; the local proxy sends form requests to the local API. Stopping the API process clears its credentials. This is for short-lived local testing only: the setup uses an owner connection and generates a new HMAC secret on each restart, so the rate-limit identity changes when restarted. Use a restricted database role and stable secret for deployment.

The test branch is not a deployment and passing local tests does not prove that email delivery or a deployed Vercel preview works.
# Preview safety

Automatic Vercel deployments are disabled for `feat/neon-staging` until the
project owner configures branch-specific Neon variables. This avoids a preview
accidentally using inherited Supabase credentials. After configuration, remove
the branch rule in `vercel.json` and deploy a preview from this branch.
