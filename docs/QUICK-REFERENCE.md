# Quick Reference: D1 + Drizzle Commands

## Local Development

### Start Dev Server
```bash
bun run dev
```
This automatically creates local D1 database at `.wrangler/state/v3/d1/`

### Database Schema Changes

```bash
# 1. Edit schema
code src/lib/server/db/schema.ts

# 2. Generate migration
bun run db:generate

# 3. Apply to local database
bunx wrangler d1 migrations apply DB --local

# If wrangler fails, use direct SQL:
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite < drizzle/XXXX_migration.sql
```

### Inspect Local Database

```bash
# View tables
sqlite3 .wrangler/state/v3/d1/*/*.sqlite ".tables"

# Query data
sqlite3 .wrangler/state/v3/d1/*/*.sqlite "SELECT * FROM users;"

# Open Drizzle Studio (dev server must be stopped first)
bun run db:studio
```

### Reset Local Database

```bash
# Delete everything
rm -rf .wrangler/

# Restart (recreates empty database)
bun run dev

# Reapply migrations
bunx wrangler d1 migrations apply DB --local
```

## Production

### One-Time Setup

```bash
# 1. Create production database
bunx wrangler d1 create fpa-events-production

# 2. Apply migrations
bunx wrangler d1 migrations apply fpa-events-production --remote

# 3. Configure in Cloudflare Dashboard:
#    Pages Project → Settings → Functions → D1 Database Bindings
#    - Variable name: DB
#    - D1 database: fpa-events-production
```

### Applying New Migrations

```bash
# After deploying your code with new migrations
bunx wrangler d1 migrations apply fpa-events-production --remote
```

### Query Production Database

```bash
# List tables
bunx wrangler d1 execute fpa-events-production --remote --command "SELECT name FROM sqlite_master WHERE type='table';"

# Query data
bunx wrangler d1 execute fpa-events-production --remote --command "SELECT * FROM users LIMIT 5;"

# Run SQL file
bunx wrangler d1 execute fpa-events-production --remote --file=scripts/seed-data.sql
```

### Database Info

```bash
# View database details
bunx wrangler d1 info fpa-events-production

# List all databases
bunx wrangler d1 list
```

## Common Tasks

### Seed Local Database

```bash
# Using SQL file
sqlite3 .wrangler/state/v3/d1/*/*.sqlite < scripts/seed-test-data.sql

# Or with wrangler
bunx wrangler d1 execute DB --local --file=scripts/seed-test-data.sql
```

### Export/Backup Database

```bash
# Export production database
bunx wrangler d1 export fpa-events-production --remote --output=backup.sql

# Import to local
sqlite3 .wrangler/state/v3/d1/*/*.sqlite < backup.sql
```

### Check Migration Status

```bash
# Local
bunx wrangler d1 migrations list DB --local

# Production
bunx wrangler d1 migrations list fpa-events-production --remote
```

## File Locations

| What | Where |
|------|-------|
| Schema Definition | `src/lib/server/db/schema.ts` |
| Database Init | `src/hooks.server.ts` |
| Migrations | `drizzle/*.sql` |
| Local Database | `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite` |
| Wrangler Config | `wrangler.toml` |
| Drizzle Config | `drizzle.config.ts` |

## Configuration

### wrangler.toml
```toml
[[ d1_databases ]]
binding = "DB"                    # Must match dashboard binding
database_name = "fpa-events-db"   # Logical name for local dev
migrations_dir = "drizzle"        # Where migrations are stored
# NO database_id here!
```

### Dashboard Binding (Production)
- **Location**: Pages Project → Settings → Functions → D1 Database Bindings
- **Variable name**: `DB` (must match `binding` in wrangler.toml)
- **D1 database**: Select your production database

## Usage in Code

```typescript
// In any server-side code (load functions, form actions, endpoints)
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function load({ locals }) {
  // Type-safe queries via locals.db
  const allUsers = await locals.db.select().from(users);
  
  const user = await locals.db
    .select()
    .from(users)
    .where(eq(users.id, 'user-123'))
    .get();
  
  return { users: allUsers, user };
}
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "D1 database binding not found" | Run `bun run dev` (not `vite dev`), check `wrangler.toml` |
| "No such table" | Apply migrations: `bunx wrangler d1 migrations apply DB --local` |
| Can't access local DB | Make sure dev server is running |
| Drizzle Studio won't connect | Stop dev server first (to release DB lock) |
| "write EPIPE" from wrangler | Use direct sqlite3 command instead |

## Environment Flow

```
Local Development:
  wrangler.toml → Wrangler → Local SQLite → platform.env.DB → Drizzle

Production:
  Dashboard Binding → Remote D1 → platform.env.DB → Drizzle
```

## Key Points

- ✅ **Same code** works in both local and production
- ✅ **Wrangler** manages database creation and injection
- ✅ **Drizzle** provides type-safe queries
- ✅ **Never commit** `database_id` to git
- ✅ **Always use** `bun run dev` (includes Wrangler)
- ✅ **Migrations** go in `drizzle/` directory
- ✅ **Configure production** via Cloudflare Dashboard

## Useful Links

- [Full D1/Drizzle Integration Guide](./D1-DRIZZLE-INTEGRATION.md)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Wrangler Commands](https://developers.cloudflare.com/workers/wrangler/commands/#d1)