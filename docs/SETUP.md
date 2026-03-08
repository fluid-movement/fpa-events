# Setup Guide

Get started with the FPA Events application in minutes.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ installed
- [npm](https://www.npmjs.com/) installed
- [Git](https://git-scm.com/) installed
- A running **PostgreSQL** instance (local or remote)

## Quick Start (Local Development)

```bash
# 1. Clone and install
git clone <your-repo-url>
cd fpa-events
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# 3. Apply database schema
npm run db:push

# 4. Start dev server
npm run dev
```

Visit `http://localhost:5173` — you're done!

## Environment Variables

Edit `.env` with your values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fpa_events

BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:5173
```

## Setting Up PostgreSQL Locally

### Option A: Docker (recommended)

```bash
docker run -d \
  --name fpa-postgres \
  -e POSTGRES_USER=fpa \
  -e POSTGRES_PASSWORD=fpa \
  -e POSTGRES_DB=fpa_events \
  -p 5432:5432 \
  postgres:16

# Your DATABASE_URL:
# postgresql://fpa:fpa@localhost:5432/fpa_events
```

### Option B: Native install

```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Create DB
createdb fpa_events
```

## Project Structure

```
fpa-events/
├── src/
│   ├── lib/
│   │   ├── server/db/         # Database schema & connection
│   │   ├── components/        # UI components
│   │   └── server/            # Server-only code
│   ├── routes/                # Pages
│   └── hooks.server.ts        # Server initialization
├── docs/                      # Documentation
└── drizzle.config.ts          # Drizzle config
```

## Making Schema Changes

```bash
# 1. Edit schema
code src/lib/server/db/schema.ts

# 2. Generate migration
npm run db:generate

# 3. Apply to database
npm run db:push

# 4. Restart dev server
npm run dev
```

## Adding Test Data

```bash
# Use Drizzle Studio (visual editor)
npm run db:studio

# Or run the seed script
npm run db:seed
```

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run check            # Type check

# Database
npm run db:generate      # Generate migration
npm run db:push          # Apply schema to database
npm run db:studio        # Visual database browser
npm run db:seed          # Seed with test data
```

## Production Deployment (Coolify)

Coolify deploys automatically on git push. Before deploying:

1. **Create a PostgreSQL database** in Coolify (or use an external managed DB)
2. **Set environment variables** in Coolify's environment panel:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `BETTER_AUTH_SECRET` — a secure random string
   - `BETTER_AUTH_URL` — your production URL
3. **Apply migrations** once:
   ```bash
   DATABASE_URL=<prod-db-url> npm run db:push
   ```
4. **Push to git** — Coolify builds and deploys automatically

Build settings in Coolify:
- Build command: `npm run build`
- Start command: `node build`

## Production Checklist

Before going live:

- [ ] `DATABASE_URL` set in Coolify environment
- [ ] `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` set
- [ ] Schema applied to production database: `npm run db:push`
- [ ] Build succeeds: `npm run build`
- [ ] Type check passes: `npm run check`
- [ ] No secrets in git

## Troubleshooting

### "DATABASE_URL is not set"

- Check your `.env` file has the correct value
- Restart the dev server after editing `.env`

### "No such table" / connection errors

- Verify PostgreSQL is running
- Run `npm run db:push` to apply schema
- Check `DATABASE_URL` is correctly formatted

### "Database is locked"

- Close Drizzle Studio and restart dev server

### Corrupted dependencies

```bash
rm -rf node_modules .svelte-kit
npm install
```

## Next Steps

- Read [STACK.md](./STACK.md) to understand the architecture
- Read [REFERENCE.md](./REFERENCE.md) for common patterns
- Start building features!

## Getting Help

- [STACK.md](./STACK.md) - How everything works
- [REFERENCE.md](./REFERENCE.md) - Quick reference
- [SvelteKit Docs](https://svelte.dev/docs/kit)
- [Drizzle Docs](https://orm.drizzle.team/)
