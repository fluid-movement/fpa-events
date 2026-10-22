# FPA Events

A modern event management application built with SvelteKit 3, Svelte 5,
PostgreSQL, Drizzle ORM and Better Auth.

## Stack

- **SvelteKit 3** (`@sveltejs/kit`) with Svelte 5 runes, deployed through `@sveltejs/adapter-node`
- **PostgreSQL** with **Drizzle ORM** and generated migrations
- **Better Auth** for sign-in and sessions
- **TailwindCSS 4**, **bits-ui** and **Lucide** for the UI
- **Cloudflare R2** for event images, **Mailgun** for email, **Turnstile** for bot protection
- **Coolify** on a Hetzner VPS for deployment

SvelteKit 3 takes its options through the `sveltekit(...)` plugin in
`vite.config.ts`, which reads `svelte-options.js`. There is no `svelte.config.js`.

## Getting started

Requires Node.js 22.17 or newer (the `engines` field in `package.json`) and a
running PostgreSQL instance.

```bash
npm install                  # also installs the git hooks (husky)
cp .env.example .env         # then fill in DATABASE_URL and BETTER_AUTH_SECRET
export DATABASE_URL=...      # drizzle-kit reads it from the shell, not from .env
npm run db:reset             # apply migrations, then seed development data
npm run dev                  # http://localhost:5173
```

`db:reset` runs `db:migrate` followed by `db:seed`. Run `npm run db:migrate`
alone to apply migrations without seeding.

## Environment variables

Every variable is declared in `src/env.ts`. All are read at runtime except the
two marked as build-time below. Blank or unset values fall back to each
service's development behaviour, except in production: a built server
(`node build`) refuses to start unless `TURNSTILE_SECRET_KEY`, `MAILGUN_API_KEY`
and `MAILGUN_DOMAIN` are set, and the error names the missing keys. The build
itself needs none of them.

| Variable                    | Purpose                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | Postgres connection string. Required; `src/lib/server/db/index.ts` throws without it.                      |
| `BETTER_AUTH_SECRET`        | Signs Better Auth sessions.                                                                                |
| `BETTER_AUTH_URL`           | Origin Better Auth validates requests against. Must match the port the app is served on.                   |
| `MAILGUN_API_KEY`           | Mailgun key. Required in production; blank in dev logs emails to the console.                              |
| `MAILGUN_DOMAIN`            | Mailgun sending domain. Required in production.                                                            |
| `MAILGUN_FROM_EMAIL`        | Sender address for outgoing email.                                                                         |
| `R2_ACCOUNT_ID`             | Cloudflare account that holds the R2 image bucket.                                                         |
| `R2_ACCESS_KEY_ID`          | R2 API access key id.                                                                                      |
| `R2_SECRET_ACCESS_KEY`      | R2 API secret.                                                                                             |
| `R2_BUCKET_NAME`            | R2 bucket for event images.                                                                                |
| `R2_PUBLIC_URL`             | Public base URL that serves images from the R2 bucket.                                                     |
| `TURNSTILE_SECRET_KEY`      | Server-side Turnstile secret. Required in production; blank in dev skips captcha.                          |
| `PUBLIC_TURNSTILE_SITE_KEY` | Browser Turnstile site key. Blank hides the widget.                                                        |
| `FPA_API_URL`               | Read-only rankings and results API. Unset shows an "unavailable" notice on the rankings pages.             |
| `GLITCHTIP_DSN`             | Server-side GlitchTip DSN. Blank disables server error reporting.                                          |
| `PUBLIC_GLITCHTIP_DSN`      | Browser GlitchTip DSN. Blank disables browser error reporting. Also needed at build time (see Deployment). |

`.env.example` lists the same variables with comments. `.env.test` is committed
and blanks the external services on purpose; see Testing.

## Project structure

```
fpa-events/
├── src/
│   ├── env.ts                     # Declared environment variables
│   ├── hooks.server.ts            # Server initialization
│   ├── app.d.ts                   # TypeScript definitions
│   ├── lib/                       # Imported as #lib/...
│   │   ├── api/                   # Remote functions shared by several routes
│   │   ├── components/            # layout/, rankings/, schedule/, ui/ (vendored shadcn-svelte)
│   │   ├── config/                # Navigation and page-title tables
│   │   ├── hooks/                 # Rune-based helpers (.svelte.ts)
│   │   ├── server/                # Server-only code; never imported by the browser
│   │   │   ├── db/                # schema.ts, index.ts, seed.ts, migrations/
│   │   │   ├── authz.ts           # Session and event-permission guards
│   │   │   ├── fpa-api/           # Client for the rankings service
│   │   │   └── utils/             # Shared queries (events, calendar)
│   │   ├── types/                 # Shapes shared between server and browser
│   │   └── utils/                 # Pure helpers: dates, html
│   └── routes/                    # SvelteKit routes; *.remote.ts sits beside its route
├── tests/integration/             # Playwright specs
├── drizzle.config.ts              # Drizzle Kit configuration
├── vite.config.ts                 # Vite, Tailwind, Sentry and Kit plugins
└── svelte-options.js              # Kit 3 options passed to sveltekit(...)
```

## Commands

All commands are npm scripts from `package.json`.

```bash
# Development
npm run dev              # Vite dev server on port 5173
npm run dev:test         # Dev server in test mode on port 5174
npm run build            # Production build (vite build) into build/
npm run preview          # Build, then serve with the Node adapter
npm run check            # svelte-kit sync and svelte-check (type check)
npm run format           # Prettier, write
npm run lint             # Prettier --check and ESLint

# Database (drizzle-kit; DATABASE_URL must be set in the environment)
npm run db:generate      # Generate a migration from src/lib/server/db/schema.ts
npm run db:migrate       # Apply generated migrations
npm run db:studio        # Open Drizzle Studio
npm run db:seed          # Seed development data
npm run db:reset         # db:migrate, then db:seed

# Tests
npm run test             # Runs `vp test run`: unit tests (Vitest), single run
npm run test:watch       # Runs `vp test watch`: unit tests, watch mode
npm run test:integration # Playwright integration tests
```

Never run `db:push` against production. Schema changes go through generated
migrations (see Deployment).

## Testing

Unit tests need nothing set up. The integration suite drives a real browser
against a real database, so it gets its own:

```bash
createdb fpa_events_test
npm run db:reset:test     # migrate and seed the test database
npm run test:integration
```

`.env.test` is committed and contains no secrets. The Mailgun, Turnstile and R2
keys are blank so each service falls back to its development behaviour. Put
machine-specific overrides, such as different Postgres credentials, in
`.env.test.local`, which is gitignored. Playwright serves the app on port 5174
through `npm run dev:test`, so it never runs against the dev database on 5173.

## Quality gates and workflow

There is no CI. Git hooks in `.husky/` are the only checks before code reaches
production, since Coolify deploys every push to `main`.

| Hook         | Runs                                                                               | Roughly |
| ------------ | ---------------------------------------------------------------------------------- | ------- |
| `pre-commit` | lint-staged (Prettier and ESLint on staged files), `npm run check`, `npm run test` | 20s     |
| `pre-push`   | `npm run build`, `npm run db:migrate:test`, `npm run test:integration`             | 2-4 min |

Bypass a hook with `--no-verify` only when you genuinely need to.

Commits go directly to `main`; see `AGENTS.md` for the full git workflow and
code conventions.

## Deployment (Coolify)

Production runs on a Hetzner VPS managed by Coolify, and its database ports are
firewalled, so production database work runs inside the Coolify terminal.

1. **Set environment variables** in Coolify: at least `DATABASE_URL`,
   `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`, plus the other variables from the
   table above that the deployment uses.
2. **Set the public GlitchTip DSN as a build argument** as well as a runtime
   variable. `PUBLIC_GLITCHTIP_DSN`'s origin is added to the Content Security
   Policy at build time (`svelte-options.js`). Source-map upload to GlitchTip
   runs only when `SENTRY_AUTH_TOKEN` is set at build time (`vite.config.ts`).
3. **Apply database migrations** from the Coolify terminal, with
   `DATABASE_URL` set in that environment:
   ```bash
   npm run db:migrate
   ```
   Schema changes ship as generated migrations committed under
   `src/lib/server/db/migrations/`. Never run `db:push` against production.
4. **Push to `main`.** Coolify builds and deploys automatically.

Coolify build settings:

- Build command: `npm run build`
- Start command: `npm run db:migrate && node build`

The `.dockerignore` at the repository root keeps `.prep`, `.agents`, `tools`,
tests, env files and dev-machine config out of the build context, so they never
reach the runtime image. `src/` (with the migrations), `package*.json`,
`drizzle.config.ts` and the build config stay, because `npm run db:migrate`
(drizzle-kit) runs from that image. The build needs `DATABASE_URL`,
`BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` but not the Turnstile or Mailgun keys.

The Node version is pinned in Coolify through `NIXPACKS_NODE_VERSION`; see the
deployment decisions via `prep knowledge find deploy`.

See [docs/deploy-checks.md](docs/deploy-checks.md) for the passive deployment check and the
Coolify and GlitchTip review procedures.

## Project knowledge

Decisions and findings for this project are recorded in prep. Use:

- `prep knowledge list` to see every entry
- `prep knowledge find <topic>` to search by topic, for example `prep knowledge find glitchtip`
- `prep knowledge show <entry>` to read one entry

`AGENTS.md` holds the rules for working in this repository.

## Troubleshooting

- **"Missing required environment variable: DATABASE_URL"**: export `DATABASE_URL` in your shell before running a `db:` script.
- **Missing tables or columns**: run `npm run db:migrate` (or `npm run db:reset` for a fresh local database).
- **Sign-in or session problems**: check that `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are set and match the port you serve on.
- **Corrupted dependencies**: `rm -rf node_modules .svelte-kit && npm install`.

## Resources

- [SvelteKit documentation](https://svelte.dev/docs/kit)
- [Drizzle ORM documentation](https://orm.drizzle.team/)
- [Better Auth documentation](https://better-auth.com/)
- [Coolify documentation](https://coolify.io/docs/)
