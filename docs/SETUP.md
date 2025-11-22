# Setup Guide

Complete setup instructions for the FPA Events application, covering both local development and production deployment.

## Prerequisites

- [Bun](https://bun.sh/) installed
- [Git](https://git-scm.com/) installed
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (for production deployment)

## Local Development Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd fpa-events

# Install dependencies
bun install
```

### 2. Start Development Server

```bash
bun run dev
```

The app will be available at `http://localhost:8788`

That's it! The local D1 database is created automatically by Wrangler.

### 3. Initialize Database (First Time)

```bash
# Apply migrations to create tables
bunx wrangler d1 migrations apply DB --local

# (Optional) Seed with test data
bunx wrangler d1 execute DB --local --file=scripts/seed-test-data.sql
```

### 4. Verify It Works

Visit `http://localhost:8788` and you should see the application running.

## Optional: Drizzle Studio

To visually browse and edit your local database:

```bash
bun run db:studio
```

Opens at `http://localhost:4983`

## Project Structure

```
fpa-events/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   └── db/
│   │   │       ├── schema.ts      # Database schema
│   │   │       └── index.ts       # DB connection
│   │   ├── components/            # UI components
│   │   └── *.remote.ts            # Remote functions (server-side)
│   ├── routes/                    # SvelteKit routes
│   ├── app.d.ts                   # Type definitions
│   ├── app.html                   # HTML template
│   └── hooks.server.ts            # Server initialization
├── drizzle/                       # Database migrations
├── docs/                          # Documentation
├── static/                        # Static assets
├── wrangler.toml                  # Cloudflare configuration
├── drizzle.config.ts              # Drizzle Kit configuration
├── svelte.config.js               # SvelteKit configuration
└── package.json                   # Dependencies and scripts
```

## Production Deployment

### Option A: Cloudflare Pages (Recommended)

#### 1. Build Your Project

```bash
bun run build
```

#### 2. Deploy via Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Create application**
3. Click **Pages** → **Connect to Git**
4. Select your repository
5. Configure build settings:
   - **Build command**: `bun run build`
   - **Build output directory**: `.svelte-kit/cloudflare`
6. Click **Save and Deploy**

#### 3. Create Production Database

```bash
# Create database
bunx wrangler d1 create fpa-events-prod

# Note the database_id from the output
```

#### 4. Configure D1 Binding

1. In Cloudflare Dashboard, go to your Pages project
2. Navigate to **Settings** → **Functions**
3. Scroll to **D1 database bindings**
4. Click **Add binding**:
   - **Variable name**: `DB`
   - **D1 database**: Select `fpa-events-prod`
5. Click **Save**

#### 5. Apply Migrations

```bash
bunx wrangler d1 migrations apply fpa-events-prod --remote
```

#### 6. Redeploy

Trigger a new deployment (push a commit or click "Retry deployment" in dashboard).

Your app is now live!

### Option B: Wrangler CLI

```bash
# Build
bun run build

# Deploy
bunx wrangler pages deploy .svelte-kit/cloudflare
```

Then follow steps 3-6 from Option A to set up the database.

## Environment Variables (Optional)

For basic local development, **no environment variables are required**. The local D1 database works automatically.

You only need `.env` if you want to:
- Use Drizzle Studio with a remote database
- Add third-party API keys (Stripe, SendGrid, etc.)

### Setup .env (if needed)

```bash
# Copy example file
cp .env.example .env

# Edit .env and add your values
```

Example `.env`:

```env
# Optional: For Drizzle Studio with remote DB
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=your-database-id
CLOUDFLARE_D1_TOKEN=your-api-token

# Add other secrets as needed
API_KEY=your-api-key
```

**Important**: Never commit `.env` to git!

## Common Commands

### Development

```bash
bun run dev              # Start dev server
bun run build            # Build for production
bun run preview          # Preview production build
bun run check            # Type check
bun run lint             # Lint code
bun run format           # Format code
```

### Database Management

```bash
# Generate migration from schema changes
bun run db:generate

# Apply migrations locally
bunx wrangler d1 migrations apply DB --local

# Apply migrations to production
bunx wrangler d1 migrations apply DB --remote

# Open Drizzle Studio
bun run db:studio

# Execute SQL command (local)
bunx wrangler d1 execute DB --local --command "SELECT * FROM events"

# Execute SQL command (production)
bunx wrangler d1 execute DB --remote --command "SELECT * FROM events"

# Run SQL file (local)
bunx wrangler d1 execute DB --local --file=script.sql

# Run SQL file (production)
bunx wrangler d1 execute DB --remote --file=script.sql
```

### Wrangler Commands

```bash
# List D1 databases
bunx wrangler d1 list

# View database info
bunx wrangler d1 info DB

# Login to Cloudflare
bunx wrangler login

# Check account info
bunx wrangler whoami
```

## Adding Features

### Add a New Table

1. **Edit schema** (`src/lib/server/db/schema.ts`):

```typescript
export const myTable = sqliteTable('my_table', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});
```

2. **Generate migration**:

```bash
bun run db:generate
```

3. **Apply migration**:

```bash
# Local
bunx wrangler d1 migrations apply DB --local

# Production
bunx wrangler d1 migrations apply DB --remote
```

### Add a Remote Function

Create `src/lib/myFeature.remote.ts`:

```typescript
import { query } from '$app/server';
import { getRequestEvent } from '$app/server';
import { myTable } from '$lib/server/db/schema';

export const getMyData = query(async () => {
  const { locals } = getRequestEvent();
  return await locals.db.select().from(myTable);
});
```

Use in component:

```svelte
<script lang="ts">
  import { getMyData } from '$lib/myFeature.remote';
  
  const dataQuery = getMyData();
</script>

{#if dataQuery.current}
  <ul>
    {#each dataQuery.current as item}
      <li>{item.name}</li>
    {/each}
  </ul>
{/if}
```

## Troubleshooting

### "D1 database binding not found"

**Cause**: Not running with Wrangler.

**Solution**: Use `bun run dev` instead of `vite dev`.

### "No such table: events"

**Cause**: Migrations haven't been applied.

**Solution**:
```bash
bunx wrangler d1 migrations apply DB --local
```

### "Database is locked"

**Cause**: Another process is accessing the database (likely Drizzle Studio).

**Solution**:
- Close Drizzle Studio
- Restart dev server

### No data in production

**Cause**: Local and production databases are separate.

**Solution**: Apply migrations and seed production database:
```bash
bunx wrangler d1 migrations apply DB --remote
bunx wrangler d1 execute DB --remote --file=scripts/seed-data.sql
```

### Drizzle Studio won't start

**Cause**: Local database doesn't exist yet.

**Solution**: Run `bun run dev` at least once to create the local database.

### Type errors

**Cause**: TypeScript types are out of sync.

**Solution**:
```bash
bun run check
```

### Port already in use

**Cause**: Another process is using port 8788 or 5173.

**Solution**:
```bash
# Find process using the port
lsof -ti:8788 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

## Reset Everything

If you want to start fresh:

```bash
# Delete local database and build artifacts
rm -rf .wrangler/
rm -rf .svelte-kit/
rm -rf node_modules/

# Reinstall
bun install

# Start fresh
bun run dev
bunx wrangler d1 migrations apply DB --local
```

## Next Steps

- Read [DATABASE.md](./DATABASE.md) for database management
- Read [REMOTE-FUNCTIONS.md](./REMOTE-FUNCTIONS.md) for data fetching patterns
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand how it all works
- Read [SECURITY.md](./SECURITY.md) before deploying to production

## Production Checklist

Before deploying to production:

- [ ] All migrations applied to production database
- [ ] Environment variables configured in Cloudflare Dashboard
- [ ] D1 binding configured for production
- [ ] No secrets committed to git
- [ ] Build succeeds: `bun run build`
- [ ] Type check passes: `bun run check`
- [ ] Lint passes: `bun run lint`
- [ ] Test the build locally: `bun run preview`

## Getting Help

- **Cloudflare D1**: [Documentation](https://developers.cloudflare.com/d1/)
- **SvelteKit**: [Documentation](https://svelte.dev/docs/kit)
- **Drizzle ORM**: [Documentation](https://orm.drizzle.team/)
- **Wrangler**: [Documentation](https://developers.cloudflare.com/workers/wrangler/)

## Summary

**Local Development**:
1. `bun install`
2. `bun run dev`
3. `bunx wrangler d1 migrations apply DB --local`

**Production Deployment**:
1. `bun run build`
2. Deploy to Cloudflare Pages
3. Create and configure D1 database
4. `bunx wrangler d1 migrations apply DB --remote`

That's it! Your app code is identical in both environments - the platform handles providing the right database connection.