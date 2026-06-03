# Security model

think-tilted was created as a Tier 1 site and later upgraded to Tier 2 via the
scaffold's `upgrade` command. That created a live Supabase project + admin user,
but did **not** push any schema or auth config — so the project briefly ran on
Supabase defaults (open self-signup, no RLS). This `supabase/` directory closes
that gap; migration `0001_events.sql` + the auth config have been pushed to the
live project.

The website pages do not yet consume the `events` feature — the secured backend
is in place ahead of the UI.

The security boundary is **Postgres Row Level Security (RLS)** — not the UI.

## Roles

| Role            | Who                                   | Read events | Write events |
| --------------- | ------------------------------------- | ----------- | ------------ |
| `anon`          | Any visitor (public anon key)         | ✅           | ❌            |
| `authenticated` | A logged-in user                      | ✅           | ❌ unless admin |
| admin           | Email listed in `public.admins`       | ✅           | ✅            |

Being logged in is **not** the same as being an admin. Writes call
`public.is_admin()`, which checks the caller's auth email against the `admins`
allowlist (seeded with the admin the upgrade created).

## Auth hardening (live)

- Public self-signup disabled — the only account is the seeded admin.
- Email confirmation required, secure password change, 12-char min password.
- TOTP MFA available for admins to enroll.

## Keys

- **Anon key** (`PUBLIC_SUPABASE_ANON_KEY`): safe in the browser; bounded by RLS.
- **Service-role key**: bypasses RLS. Never committed, never shipped to browser.

## Lost the admin password?

Never stored in retrievable form (one-way hash). Reset it from the Supabase
dashboard → Authentication → Users → "Send recovery", or set a new one there.
