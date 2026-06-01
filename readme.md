# Think Tilted

Company site for Think Tilted — a web agency that builds fast, focused websites for small businesses.

**Live:** [thinktilted.com](https://thinktilted.com)

## Stack

- [Astro](https://astro.build) — static-first, server-rendered when needed
- [Tailwind CSS v4](https://tailwindcss.com) — utility-first styling
- [TypeScript](https://www.typescriptlang.org) — strict mode
- [Netlify](https://netlify.com) — hosting, SSL, edge delivery

## Local Development

```bash
npm install
npm run dev
```

Site runs at `http://localhost:4321`.

A `.env` file is required locally (see `.env.example` for the expected keys).

## Deploying

Deploys are triggered by **publishing a GitHub release**, not by pushing to `main`.
This conserves Netlify build minutes and keeps production deploys deliberate.

```bash
gh release create v1.x.x --generate-notes
```

Pushing to `main` is safe — it will not trigger a production deploy.
