# FPA Events

A modern event management application built with SvelteKit 5, PostgreSQL, and Better Auth.

## Stack

### Frontend

- **SvelteKit 5** - Full-stack framework with file-based routing
- **Svelte 5** - Reactive UI framework
- **TailwindCSS 4** - Utility-first CSS framework
- **bits-ui** - Headless UI components
- **Lucide Svelte** - Icon library

### Backend & Database

- **PostgreSQL** - Relational database
- **Drizzle ORM** - Type-safe database toolkit

### Authentication

- **Better Auth** - Modern authentication library

### Deployment

- **Coolify** - Self-hosted VPS deployment
- **@sveltejs/adapter-node** - Node.js server adapter

### Development

- **Vite+ (`vp`)** - Local toolchain: dev server, tests, task running, dependency management
- **Vite 8 / Rolldown** - Bundler (Rolldown is the default in Vite 8)
- **npm** - Package manager, driven through `vp`
- **TypeScript** - Type safety
- **ESLint & Prettier** - Code quality and formatting

**`vp` is for local development only. The production build deliberately does
not involve it.** `build` is plain `vite build`, so the artifact Coolify deploys
is produced by the same bundler it always was, and a broken or missing `vp`
can never take the deploy down.

What `vp` does own locally: `dev` → `vp dev`, `test` → `vp test run`,
`dev:test` → `vp dev --mode test`, plus dependency management.

For dependencies, `vp` really is a wrapper: `packageManager` is `npm@11.12.1`,
and `vp install` / `add` / `remove` delegate to npm. The lockfile stays a normal
`package-lock.json`, so nothing that expects npm is affected. For `dev` and
`test` it is not a wrapper — it runs its own Rolldown-based Vite and its own
bundled Vitest, which is why those are scoped to local work.

Formatting and linting also stay off `vp`: `vp fmt` / `vp lint` would replace
Prettier and ESLint with oxfmt/oxlint, and oxfmt does not yet format `.svelte`
components (only `.svelte.ts` files), so it would silently skip almost the
entire UI.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 22.12+
- A running PostgreSQL instance
- [Vite+](https://viteplus.dev/guide/) (`vp`) — optional for the first install,
  see below

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd fpa-events

# Install dependencies. `npm install` bootstraps vp itself, so it works on a
# fresh clone with no global install; use `vp install` once you have vp.
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# Apply database schema
vp run db:push

# Start development server
vp dev
```

The app will be available at `http://localhost:5173`

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fpa_events

BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:5173
```

## Project Structure

```
fpa-events/
├── src/
│   ├── lib/
│   │   ├── api/                   # Remote functions shared by several routes
│   │   ├── components/
│   │   │   ├── layout/            # The shared page kit — PageShell, Section,
│   │   │   │                      #   DataList, ConfirmSubmit, EmptyState …
│   │   │   ├── rankings/          # Leaderboard tables and panels
│   │   │   ├── schedule/          # Schedule list, cards and item form
│   │   │   └── ui/                # Vendored shadcn-svelte primitives
│   │   ├── config/                # Navigation and page-title tables
│   │   ├── hooks/                 # Rune-based helpers (.svelte.ts)
│   │   ├── server/                # Server-only code — never imported by the browser
│   │   │   ├── db/
│   │   │   │   ├── schema.ts      # Database schema
│   │   │   │   ├── index.ts       # DB connection
│   │   │   │   ├── seed.ts        # Development seed data
│   │   │   │   └── migrations/    # Auto-generated migrations
│   │   │   ├── authz.ts           # Session and event-permission guards
│   │   │   ├── fpa-api/           # Client for the external rankings service
│   │   │   └── utils/             # Shared queries (events, calendar tokens)
│   │   ├── types/                 # Shapes shared between server and browser
│   │   └── utils/                 # Pure helpers — dates, html, collections
│   ├── routes/                    # SvelteKit routes; *.remote.ts sits with its route
│   ├── app.d.ts                   # TypeScript definitions
│   └── hooks.server.ts            # Server initialization
├── tests/integration/             # Playwright specs
├── docs/                          # Documentation
└── drizzle.config.ts              # Drizzle Kit configuration
```

## Available Commands

`vp <command>` runs a built-in Vite+ command; `vp run <script>` runs a script
from `package.json`.

```bash
# Development
vp dev                   # Start dev server
vp run build             # Build for production (plain `vite build`, no vp)
vp run preview           # Build, then serve with the Node adapter

# Database
vp run db:generate       # Generate migrations from schema
vp run db:push           # Apply schema to database
vp run db:studio         # Open Drizzle Studio
vp run db:seed           # Seed database with test data

# Code Quality
vp run lint              # Lint code (Prettier + ESLint)
vp run format            # Format code (Prettier)
vp run check             # Type check (svelte-check)

# Tests
vp test run              # Unit tests (Vitest), single run
vp test watch            # Unit tests, watch mode
vp test related          # Unit tests related to changed files
vp run test:integration  # Integration tests (Playwright)
```

### Dependency Management

`vp` wraps npm, so the lockfile stays a normal `package-lock.json` and anything
that expects npm keeps working.

```bash
vp install               # Install everything (alias: vp i)
vp add <pkg>             # Add a dependency
vp add -D <pkg>          # Add a devDependency
vp remove <pkg>          # Remove a dependency
vp outdated              # Show outdated packages
vp update                # Update packages to their latest versions
vp dedupe                # Remove duplicate versions
vp why <pkg>             # Explain why a package is installed
```

Prefer these over their `npm` equivalents so the toolchain stays in charge of
resolution and the task cache stays valid.

## Testing

Unit tests run against mocked modules and need nothing set up. The integration
suite drives a real browser against a real database, so it gets its own:

```bash
createdb fpa_events_test
vp run db:reset:test      # migrate + seed the test database
vp run test:integration
```

`.env.test` is committed and deliberately contains no secrets — the Mailgun,
Turnstile and R2 keys are blank so each service falls back to its dev behaviour
and the suite never touches a real external service. Put machine-specific
overrides (different Postgres credentials, say) in `.env.test.local`, which is
gitignored.

The suite serves the app on port **5174** (`vp run dev:test`), separate from the
dev server's 5173, so it can never accidentally run against your dev database.

### Quality gates

There is no CI: git hooks are the only thing between a commit and a production
deploy, since Coolify deploys every push.

| Hook         | Runs                                                                   | Roughly |
| ------------ | ---------------------------------------------------------------------- | ------- |
| `pre-commit` | Prettier + ESLint on staged files, `npm run check`, `npm run test`     | 20s     |
| `pre-push`   | `npm run build`, `npm run db:migrate:test`, `npm run test:integration` | 2-4 min |

The hooks call `npm run` rather than `vp run` so they work regardless of whether
`vp` is on `PATH` in the hook's environment. This also means `pre-push` builds
with the same plain `vite build` that Coolify runs, which is the point of the
gate — it catches broken deploys, so it must exercise the production path.

Both are installed by husky on install (`vp install` or `npm install`). Bypass
with `--no-verify` when you genuinely need to.

## Deployment (Coolify)

1. **Create a PostgreSQL database** in Coolify or use an external managed DB
2. **Set environment variables** in Coolify:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL`
3. **Apply schema** to production database:
   ```bash
   DATABASE_URL=<prod-url> npm run db:push
   ```
4. **Push to git** — Coolify builds and deploys automatically

Coolify build settings:

- Build command: `npm run build`
- Start command: `node build`

Neither involves `vp`. `npm run build` is plain `vite build` and `node build`
runs the adapter-node output, so the deploy depends only on npm, Vite and Node —
exactly as before Vite+ was introduced locally.

## Documentation

- [docs/SETUP.md](docs/SETUP.md) - Detailed setup guide
- [docs/STACK.md](docs/STACK.md) - Architecture overview
- [docs/REFERENCE.md](docs/REFERENCE.md) - Quick reference
- [docs/POSTGRES-SETUP.md](docs/POSTGRES-SETUP.md) - PostgreSQL setup guide

## Troubleshooting

- **"DATABASE_URL is not set"**: Check your `.env` file
- **"relation does not exist"**: Run `vp run db:push` to apply schema
- **"Authentication failed"**: Verify `BETTER_AUTH_SECRET` is set
- **Corrupted dependencies**: Run `rm -rf node_modules .svelte-kit && vp install`
- **Stale build after changing deps**: `vp cache` manages the task cache; a
  dev server started with `vp dev` re-optimizes automatically when the lockfile
  changes

## License

[MIT](LICENSE)

## Resources

- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Vite+ Documentation](https://viteplus.dev/guide/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better Auth Documentation](https://better-auth.com/)
- [Coolify Documentation](https://coolify.io/docs/)
