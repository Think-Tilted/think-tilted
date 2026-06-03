# Think Tilted

Company site for Think Tilted — a web agency that builds fast, focused websites for small businesses.

**Live:** [thinktilted.com](https://thinktilted.com)

## Stack

- [Astro](https://astro.build) — static-first, server-rendered when needed
- [Tailwind CSS v4](https://tailwindcss.com) — utility-first styling
- [TypeScript](https://www.typescriptlang.org) — strict mode
- [Netlify](https://netlify.com) — hosting, SSL, edge delivery
- [Supabase](https://supabase.com) — Postgres + Auth backend (RLS-secured)

## Local Development

```bash
npm install
npm run dev
```

Site runs at `http://localhost:4321`.

A `.env` file is required locally (see `.env.example` for the expected keys),
including `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`.

## Backend (Tier 2)

This site is provisioned as a Tier 2 project: a live, hardened Supabase backend
is in place and ready to use.

- **Schema & config** live in `supabase/`. The `events` table is public-read /
  admin-write, gated by Row Level Security and an `admins` allowlist.
- **Auth is hardened**: self-signup disabled, email confirmation required,
  12-char minimum password, TOTP MFA available. The only account is the seeded
  admin.
- See [`SECURITY.md`](./SECURITY.md) for the full security model.

The backend is provisioned ahead of the UI — the public pages don't consume the
`events` feature yet. The connection has been verified locally against the live
project.

Push schema or auth changes to the live project with:

```bash
supabase db push       # apply new migrations
supabase config push   # apply auth/config changes
```

## Deploying

Deploys are triggered by **publishing a GitHub release**, not by pushing to `main`.
This conserves Netlify build minutes and keeps production deploys deliberate.

```bash
gh release create v1.x.x --generate-notes
```

Pushing to `main` is safe — it will not trigger a production deploy.
