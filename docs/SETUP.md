# Setup Guide

Get started with the FPA Events application in minutes.

## Prerequisites

- [Bun](https://bun.sh/) installed
- [Git](https://git-scm.com/) installed
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (for production only)

## Quick Start (Local Development)

```bash
# 1. Clone and install
git clone <your-repo-url>
cd fpa-events
bun install

# 2. Start dev server
bun run dev

# 3. Apply database migrations
bunx wrangler d1 migrations apply DB --local
```

Visit `http://localhost:8788` - you're done!

## What Just Happened?

1. **Wrangler** started and created a local D1 database at `.wrangler/state/v3/d1/`
2. **Migrations** created the database tables
3. **SvelteKit** connected to the database automatically

No environment variables needed for basic development!

## Project Structure

```
fpa-events/
├── src/
│   ├── lib/
│   │   ├── server/db/         # Database schema
│   │   ├── components/        # UI components
│   │   └── *.remote.ts        # Server functions
│   ├── routes/                # Pages
│   └── hooks.server.ts        # DB initialization
├── drizzle/                   # Migrations
├── docs/                      # Documentation
└── wrangler.toml              # Cloudflare config
```

## Adding Test Data

```bash
# Option 1: Using Wrangler
bunx wrangler d1 execute DB --local --file=scripts/seed-test-data.sql

# Option 2: Direct SQLite
D1_DB=$(find .wrangler -name "*.sqlite" | head -n 1)
sqlite3 "$D1_DB" "INSERT INTO events (id, name, start_date) VALUES ('1', 'Test Event', $(date +%s));"

# Option 3: Use Drizzle Studio (visual editor)
bun run db:studio
```

## Making Schema Changes

```bash
# 1. Edit schema
code src/lib/server/db/schema.ts

# 2. Generate migration
bun run db:generate

# 3. Apply locally
bunx wrangler d1 migrations apply DB --local

# 4. Restart dev server
bun run dev
```

## Optional: Environment Variables

Only needed for:
- Using Drizzle Studio with remote database
- Adding third-party API keys

```bash
# Copy example
cp .env.example .env

# Edit with your values
code .env
```

Example `.env`:
```env
# Optional: For Drizzle Studio with remote DB
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=your-database-id
CLOUDFLARE_D1_TOKEN=your-api-token
```

## Production Deployment

### 1. Create Production Database

```bash
# Create database
bunx wrangler d1 create fpa-events-prod

# Copy the database_id from output
```

### 2. Deploy to Cloudflare Pages

#### Option A: Via GitHub (Recommended)

1. Push code to GitHub
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
4. Select your repository
5. Configure:
   - Build command: `bun run build`
   - Build output: `.svelte-kit/cloudflare`
6. Click **Save and Deploy**

#### Option B: Via CLI

```bash
bun run build
bunx wrangler pages deploy .svelte-kit/cloudflare
```

### 3. Configure D1 Binding

1. In Cloudflare Dashboard, go to your Pages project
2. **Settings** → **Functions** → **D1 database bindings**
3. Click **Add binding**:
   - Variable name: `DB`
   - D1 database: Select `fpa-events-prod`
4. Click **Save**

### 4. Apply Migrations

```bash
bunx wrangler d1 migrations apply fpa-events-prod --remote
```

### 5. Redeploy

Trigger a new deployment (push a commit or click "Retry deployment").

Your app is live! 🎉

## Common Commands

```bash
# Development
bun run dev              # Start dev server
bun run build            # Build for production
bun run check            # Type check

# Database
bun run db:generate      # Generate migration
bun run db:studio        # Visual database browser
bunx wrangler d1 migrations apply DB --local    # Apply locally
bunx wrangler d1 migrations apply DB --remote   # Apply to production

# Query database
bunx wrangler d1 execute DB --local --command "SELECT * FROM events"
bunx wrangler d1 execute DB --remote --command "SELECT * FROM events"
```

## Troubleshooting

### "D1 database binding not found"
- Use `bun run dev` (not `vite dev`)

### "No such table"
- Apply migrations: `bunx wrangler d1 migrations apply DB --local`

### "Database is locked"
- Close Drizzle Studio and restart dev server

### No data showing
- Insert test data (see "Adding Test Data" above)

### Port already in use
```bash
lsof -ti:8788 | xargs kill -9
bun run dev
```

## Reset Everything

Start fresh:

```bash
rm -rf .wrangler/ .svelte-kit/ node_modules/
bun install
bun run dev
bunx wrangler d1 migrations apply DB --local
```

## Next Steps

- Read [STACK.md](./STACK.md) to understand the architecture
- Read [REFERENCE.md](./REFERENCE.md) for common patterns
- Start building features!

## Production Checklist

Before going live:

- [ ] Migrations applied to production database
- [ ] D1 binding configured in Cloudflare Dashboard
- [ ] Environment variables set (if any)
- [ ] Build succeeds: `bun run build`
- [ ] Type check passes: `bun run check`
- [ ] No secrets in git

## Getting Help

- [STACK.md](./STACK.md) - How everything works
- [REFERENCE.md](./REFERENCE.md) - Quick reference
- [SvelteKit Docs](https://svelte.dev/docs/kit)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Drizzle Docs](https://orm.drizzle.team/)