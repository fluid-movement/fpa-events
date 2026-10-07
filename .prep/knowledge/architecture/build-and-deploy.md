---
type: component
title: Build, quality gates and deploy
description: vp vs npm, the husky gates, Coolify deploy, production migrations and env vars.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:44:51Z
scope:
  - package.json
  - .husky
  - .npmrc
  - drizzle.config.ts
  - .env.example
  - src/env.ts
  - svelte-options.js
  - UPDATE.md
  - src/hooks.server.ts
  - src/lib/server/errors.ts
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Build, quality gates and deploy

## Toolchain split

`dev` and `dev:test` run plain `vite dev` (the latter `--mode test --port
5174`): `vp dev` cannot run the SvelteKit 3 dev server ("Vite SSR environment
must be a RunnableDevEnvironment"), see `UPDATE.md`. Whether to move back
onto vite-plus 1.0 is an open decision. `vp` (vite-plus 0.2.x) still drives
`test` → `vp test run`, Playwright's `vp run dev:test`, and dependency
management (`vp install/add/remove`, which delegate to npm; the lockfile stays
`package-lock.json`). The production build does **not** use vp: `build` is plain
`vite build`, and Coolify runs `npm run build` then `node build`
(`adapter-node`, output in `build/`). Prettier and ESLint stay off vp, because
oxfmt does not format `.svelte` files.

## Gates

There is no CI. Coolify deploys every push to `main`, so the husky hooks are
the only gate:

- `pre-commit` (~20 s): `npx lint-staged` (Prettier + ESLint on staged files),
  `npm run check` (svelte-check), `npm run test` (Vitest).
- `pre-push` (~2–4 min): `npm run build`, `npm run db:migrate:test`,
  `npm run test:integration` (Playwright).

The hooks call `npm run`, not `vp run`, so they work without vp on PATH and the
build they run is the same one Coolify runs. `npm run lint` is not in a hook,
because it checks the whole repo. `--no-verify` bypasses both hooks, and should
be a deliberate choice.

## Database migrations in production

The schema lives in `src/lib/server/db/schema.ts`; `npm run db:generate` writes
SQL into `src/lib/server/db/migrations/`. The production DB ports are
firewalled, so `npm run db:migrate` must be run server-side from the Coolify
terminal, not from a laptop. The README's `db:push` instruction is stale.
How migrations are triggered on deploy is configured in Coolify, not in the
repo; check there before assuming either way.

## Environment

Declared in `src/env.ts` and read via `$app/env/private` / `$app/env/public`
(Kit 3). See `.env.example`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
Mailgun (`MAILGUN_*`), R2 (`R2_*`), Turnstile (`PUBLIC_TURNSTILE_SITE_KEY`,
`TURNSTILE_SECRET_KEY`) and `FPA_API_URL`. Every external service except the
database has a fallback when its keys are blank: email is logged to the
console, the captcha is skipped, and rankings show an "unavailable" notice.
Uploads are the exception and fail without R2 keys.

`package.json` carries an `overrides` entry pinning better-auth's
`@sveltejs/kit` peer to the root Kit, because better-auth still peers Kit 2.

adapter-node 6 removed the `ORIGIN` env var in favour of the `paths.origin`
option, which the repo does not set. The deployed origin behind Coolify's
proxy has to be verified (tracked under Go Live).

## Errors in production

`handleError` in `src/hooks.server.ts` handles unexpected server errors
(`kind: 'unknown'`) only. Each gets an 8-character reference that is shown on the
error page ("quote reference …") and logged on one line with method, **route
id** (never the raw path: calendar-feed and invite URLs carry tokens) and user
id, followed by the stack. Search the Coolify log for `ref=<id>`. Errors thrown
with `error()` keep Kit's defaults and are not logged. The rules live in
`describeServerError` (`src/lib/server/errors.ts`, unit-tested). Coolify logs are
lost on redeploy; choosing an error tracker is an open decision.

Stack traces are readable as deployed: verified on Node 22.19 against the
production build (2026-10-07), the app's frames already name source files
(`src/routes/+page.server.ts:14:43`) without any flag. Setting
`NODE_OPTIONS=--enable-source-maps` in Coolify additionally maps framework and
dependency frames and prints absolute paths; it is optional.
