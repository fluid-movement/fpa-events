# Turso Database Setup Guide

This guide walks you through setting up Turso (libSQL) as the database for your FPA Events application.

## Database Pattern

This project follows the standard Drizzle ORM pattern:
- Database instance is exported directly from `src/lib/server/db/index.ts`
- Environment variables are read from `process.env` (works in both local and Cloudflare)
- Simply import `{ db }` wherever you need database access

```typescript
// src/lib/server/db/index.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

export const db = drizzle(client, { schema });
```

```typescript
// Usage anywhere in your app
import { db } from '$lib/server/db';

const users = await db.select().from(usersTable);
```

## What is Turso?

**Turso** is a distributed database built on libSQL (a fork of SQLite). It offers:

- 🌍 **Edge-hosted** - Low latency worldwide
- 🔄 **SQLite-compatible** - Use familiar SQLite syntax
- 🚀 **Serverless-ready** - Perfect for Cloudflare Workers/Pages
- 💰 **Generous free tier** - 500 databases, 9GB total storage, 1B row reads/month
- 🔐 **Built-in auth** - Token-based authentication

## Prerequisites

- A [Turso account](https://turso.tech/) (free to sign up)
- [Turso CLI](https://docs.turso.tech/cli/installation) installed
- Bun or Node.js installed

## Step 1: Install Turso CLI

### macOS/Linux
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### Windows
```bash
curl -sSfL https://get.tur.so/install.ps1 | powershell
```

### Verify installation
```bash
turso --version
```

## Step 2: Authenticate with Turso

```bash
# Login to your Turso account
turso auth login
```

This will open a browser window for authentication. Once completed, you'll see a success message in your terminal.

## Step 3: Create a Database

### Create a new database
```bash
# Create a database named "fpa-events"
turso db create fpa-events
```

### Verify database creation
```bash
# List all your databases
turso db list
```

You should see your newly created `fpa-events` database in the list.

### Get database information
```bash
# View detailed information about your database
turso db show fpa-events
```

This displays:
- Database name
- Database URL
- Regions
- Created date
- Size

## Step 4: Get Your Database Credentials

### 1. Get the database URL
```bash
turso db show fpa-events --url
```

This returns something like:
```
libsql://your-database-name-yourorg.turso.io
```

### 2. Create an authentication token
```bash
turso db tokens create fpa-events
```

This generates an authentication token. **Keep this secure!** It provides full access to your database.

**Token options:**
- Default: Never expires
- `--expiration 7d`: Expires in 7 days
- `--expiration 1h`: Expires in 1 hour
- `--read-only`: Read-only access

Example with expiration:
```bash
turso db tokens create fpa-events --expiration 30d
```

## Step 5: Configure Environment Variables

### Local Development

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   # Turso Database Configuration
   TURSO_DATABASE_URL=libsql://your-database-name-yourorg.turso.io
   TURSO_AUTH_TOKEN=eyJhbGc...your-token-here
   
   # Better Auth Configuration
   BETTER_AUTH_SECRET=your-random-secret-key-here
   BETTER_AUTH_URL=http://localhost:5173
   ```

3. Generate a secret for Better Auth:
   ```bash
   # Generate a random secret
   openssl rand -base64 32
   ```

### Production (Cloudflare)

Set secrets using Wrangler CLI:

```bash
# Set Turso database URL
wrangler secret put TURSO_DATABASE_URL
# Paste your database URL when prompted

# Set Turso auth token
wrangler secret put TURSO_AUTH_TOKEN
# Paste your auth token when prompted

# Set Better Auth secret
wrangler secret put BETTER_AUTH_SECRET
# Paste your secret when prompted
```

Alternatively, set them in the Cloudflare Dashboard:
1. Go to **Workers & Pages**
2. Select your project
3. Go to **Settings** → **Variables and Secrets**
4. Add the environment variables as **Secrets** (encrypted)

## Step 6: Apply Database Migrations

### Generate migrations (if schema changed)
```bash
bun run db:generate
```

### Apply migrations to Turso
```bash
bun run db:migrate
```

This applies all pending migrations from `src/lib/server/db/migrations/` to your Turso database.

### Verify migrations
```bash
# Open Turso shell
turso db shell fpa-events

# View schema
.schema

# Exit
.quit
```

## Step 7: Verify Connection

### Test the connection
```bash
# Start the development server
bun run dev
```

If everything is configured correctly, the app will start without errors and connect to your Turso database.

### Check database tables
```bash
# Open Drizzle Studio
bun run db:studio
```

This opens a visual database browser at `http://localhost:4983` where you can:
- View all tables
- Browse data
- Run queries
- Modify records

## Common Turso CLI Commands

### Database Management
```bash
# List all databases
turso db list

# Show database details
turso db show fpa-events

# Get database URL
turso db show fpa-events --url

# Destroy a database (careful!)
turso db destroy fpa-events
```

### Token Management
```bash
# Create a new token
turso db tokens create fpa-events

# Create a read-only token
turso db tokens create fpa-events --read-only

# Create a token with expiration
turso db tokens create fpa-events --expiration 7d

# Revoke all tokens (generates new ones)
turso db tokens invalidate fpa-events
```

### Database Shell
```bash
# Open interactive shell
turso db shell fpa-events

# Execute a single query
turso db shell fpa-events "SELECT * FROM users"

# Execute SQL from a file
turso db shell fpa-events < seed.sql
```

### Database Inspection
```bash
# View schema
turso db shell fpa-events ".schema"

# View specific table schema
turso db shell fpa-events ".schema users"

# List all tables
turso db shell fpa-events ".tables"

# Show database statistics
turso db shell fpa-events "SELECT * FROM sqlite_master WHERE type='table'"
```

## Multiple Environments

### Development and Production Databases

It's recommended to use separate databases for development and production:

```bash
# Create development database
turso db create fpa-events-dev

# Create production database
turso db create fpa-events-prod
```

Then use different tokens and URLs in your `.env` vs production secrets:

**Local `.env`:**
```env
TURSO_DATABASE_URL=libsql://fpa-events-dev-yourorg.turso.io
TURSO_AUTH_TOKEN=<dev-token>
```

**Production (Cloudflare secrets):**
```env
TURSO_DATABASE_URL=libsql://fpa-events-prod-yourorg.turso.io
TURSO_AUTH_TOKEN=<prod-token>
```

## Turso Regions

Turso supports multi-region deployment for low latency worldwide.

### Create a database in a specific region
```bash
# List available regions
turso db locations

# Create database in a specific region
turso db create fpa-events --location iad  # US East
turso db create fpa-events --location fra  # Europe
```

### Add replica regions
```bash
# Add a replica in another region
turso db replicate fpa-events lhr  # Add London replica
```

## Monitoring and Limits

### View database usage
```bash
turso db show fpa-events
```

### Check plan limits
```bash
turso plan show
```

### Free Tier Limits
- **Databases:** 500
- **Storage:** 9GB total
- **Row reads:** 1 billion/month
- **Row writes:** 25 million/month
- **Locations:** 3 per database

## Troubleshooting

### "Authentication failed" error
**Cause:** Invalid or expired token

**Solution:**
```bash
# Create a new token
turso db tokens create fpa-events

# Update your .env file with the new token
```

### "Database not found" error
**Cause:** Wrong database name or URL

**Solution:**
```bash
# Verify database exists
turso db list

# Get correct URL
turso db show fpa-events --url

# Update TURSO_DATABASE_URL in .env
```

### "No such table" error
**Cause:** Migrations not applied

**Solution:**
```bash
# Apply migrations
bun run db:migrate

# Verify tables exist
turso db shell fpa-events ".tables"
```

### "Cannot connect to database" error
**Cause:** Network issues or wrong URL

**Solution:**
```bash
# Test connection with Turso CLI
turso db shell fpa-events "SELECT 1"

# Check your internet connection
# Verify URL in .env matches database URL
turso db show fpa-events --url
```

### Token expired
**Cause:** Token created with expiration has expired

**Solution:**
```bash
# Create a new token (no expiration)
turso db tokens create fpa-events

# Or create with longer expiration
turso db tokens create fpa-events --expiration 365d
```

## Security Best Practices

### 1. Never commit tokens to Git
✅ Add `.env` to `.gitignore` (already done)
✅ Use `.env.example` for templates without actual credentials

### 2. Use different tokens per environment
```bash
# Development token (shorter expiration)
turso db tokens create fpa-events-dev --expiration 30d

# Production token (no expiration, stored securely)
turso db tokens create fpa-events-prod
```

### 3. Use read-only tokens where possible
```bash
# For analytics or reporting tools
turso db tokens create fpa-events --read-only
```

### 4. Rotate tokens regularly
```bash
# Invalidate all existing tokens
turso db tokens invalidate fpa-events

# Create new tokens
turso db tokens create fpa-events
```

### 5. Store production tokens as secrets
- Use Cloudflare secrets (encrypted at rest)
- Never use environment variables for sensitive data in production
- Use `wrangler secret put` instead of plain environment variables

## Migration from D1 to Turso

If you're migrating from Cloudflare D1:

### 1. Export D1 data
```bash
# Export from D1
wrangler d1 execute DB --remote --command ".dump" > d1-dump.sql
```

### 2. Import to Turso
```bash
# Import to Turso
turso db shell fpa-events < d1-dump.sql
```

### 3. Update code
- Change `drizzle-orm/d1` imports to `drizzle-orm/libsql`
- Replace D1 binding with Turso credentials
- Update `drizzle.config.ts` dialect from `sqlite` to `turso`

### 4. Test thoroughly
```bash
# Run migrations
bun run db:migrate

# Start dev server
bun run dev

# Run tests
bun test
```

## Resources

- [Turso Documentation](https://docs.turso.tech/)
- [Turso CLI Reference](https://docs.turso.tech/cli/introduction)
- [Turso Platform Limits](https://docs.turso.tech/reference/platform-limits)
- [Turso Pricing](https://turso.tech/pricing)
- [Drizzle + Turso Guide](https://orm.drizzle.team/docs/get-started-sqlite#turso)
- [libSQL Documentation](https://github.com/tursodatabase/libsql)

## Next Steps

After setting up Turso:

1. ✅ Test your database connection: `bun run dev`
2. ✅ Open Drizzle Studio: `bun run db:studio`
3. ✅ Seed your database: `bun run db:seed`
4. ✅ Deploy to Cloudflare: `bun run deploy`
5. ✅ Set up production database monitoring

Happy coding! 🚀