# Quick Reference

Essential commands and patterns for daily development.

## Common Commands

### Development

```bash
bun run dev              # Start dev server (localhost:8788)
bun run build            # Build for production
bun run preview          # Preview production build
bun run check            # Type check
bun run lint             # Lint code
bun run format           # Format code
```

### Database

```bash
# Generate migration from schema changes
bun run db:generate

# Apply migrations locally
bunx wrangler d1 migrations apply DB --local

# Apply migrations to production
bunx wrangler d1 migrations apply DB --remote

# Open Drizzle Studio (visual database browser)
bun run db:studio

# Query local database
bunx wrangler d1 execute DB --local --command "SELECT * FROM events"

# Query production database
bunx wrangler d1 execute DB --remote --command "SELECT * FROM events"

# List all databases
bunx wrangler d1 list

# View database info
bunx wrangler d1 info DB
```

### Deployment

```bash
# Deploy to Cloudflare Pages
bun run build
bunx wrangler pages deploy .svelte-kit/cloudflare

# Or push to GitHub (auto-deploys via Cloudflare Pages)
git push origin main
```

## File Locations

| What | Where |
|------|-------|
| Database schema | `src/lib/server/db/schema.ts` |
| DB initialization | `src/hooks.server.ts` |
| Remote functions | `src/lib/*.remote.ts` |
| Routes | `src/routes/` |
| Components | `src/lib/components/` |
| Migrations | `drizzle/` |
| Local database | `.wrangler/state/v3/d1/*.sqlite` |
| Config | `wrangler.toml`, `drizzle.config.ts` |

## Database Schema Patterns

### Define Table

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

// Infer types
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

### Common Column Types

```typescript
text('name')                                    // String
text('email').notNull()                         // Required string
integer('age')                                  // Number
integer('created_at', { mode: 'timestamp' })    // Date as timestamp
integer('active', { mode: 'boolean' })          // Boolean
text('status').default('pending')               // With default value
```

### Relationships

```typescript
export const users = sqliteTable('users', {
  id: text('id').primaryKey()
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id)
});
```

## Remote Functions

### Query (Read Data)

```typescript
import { query } from '$app/server';
import { getRequestEvent } from '$app/server';
import { events } from '$lib/server/db/schema';
import * as v from 'valibot';

// Simple query
export const getAllEvents = query(async () => {
  const { locals } = getRequestEvent();
  return await locals.db.select().from(events);
});

// Query with parameters
export const getEvent = query(v.string(), async (id) => {
  const { locals } = getRequestEvent();
  return await locals.db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .get();
});

// Query with validation
export const searchEvents = query(
  v.object({
    name: v.optional(v.string()),
    startDate: v.optional(v.number())
  }),
  async (filters) => {
    const { locals } = getRequestEvent();
    // ... query logic
  }
);
```

### Mutation (Write Data)

```typescript
import { mutation } from '$app/server';

export const createEvent = mutation(
  v.object({
    name: v.string(),
    startDate: v.number()
  }),
  async (data) => {
    const { locals } = getRequestEvent();
    const id = crypto.randomUUID();
    await locals.db.insert(events).values({ id, ...data });
    return { id };
  }
);

export const updateEvent = mutation(
  v.object({
    id: v.string(),
    name: v.string()
  }),
  async (data) => {
    const { locals } = getRequestEvent();
    await locals.db
      .update(events)
      .set({ name: data.name })
      .where(eq(events.id, data.id));
  }
);

export const deleteEvent = mutation(v.string(), async (id) => {
  const { locals } = getRequestEvent();
  await locals.db.delete(events).where(eq(events.id, id));
});
```

### Use in Components

```svelte
<script lang="ts">
  import { getAllEvents, createEvent } from '$lib/events.remote';
  
  const eventsQuery = getAllEvents();
  
  let name = '';
  
  async function handleCreate() {
    await createEvent({
      name,
      startDate: Date.now()
    });
    eventsQuery.refresh(); // Refresh data
  }
</script>

{#if eventsQuery.error}
  <p>Error: {eventsQuery.error.message}</p>
{:else if eventsQuery.loading}
  <p>Loading...</p>
{:else if eventsQuery.current}
  <ul>
    {#each eventsQuery.current as event (event.id)}
      <li>{event.name}</li>
    {/each}
  </ul>
{/if}

<input bind:value={name} />
<button onclick={handleCreate}>Create</button>
```

## Drizzle Query Patterns

### Select

```typescript
// All rows
const all = await db.select().from(events);

// Single row
const one = await db.select().from(events).where(eq(events.id, '123')).get();

// Specific columns
const names = await db.select({ name: events.name }).from(events);

// With limit/offset
const page = await db.select().from(events).limit(10).offset(20);

// Ordered
const sorted = await db.select().from(events).orderBy(events.createdAt);
```

### Insert

```typescript
// Single row
await db.insert(events).values({
  id: crypto.randomUUID(),
  name: 'Event 1'
});

// Multiple rows
await db.insert(events).values([
  { id: '1', name: 'Event 1' },
  { id: '2', name: 'Event 2' }
]);

// Return inserted data
const result = await db.insert(events).values({ ... }).returning();
```

### Update

```typescript
// Update all
await db.update(events).set({ name: 'New Name' });

// Update with condition
await db
  .update(events)
  .set({ name: 'Updated' })
  .where(eq(events.id, '123'));

// Update multiple fields
await db
  .update(events)
  .set({
    name: 'Updated',
    description: 'New description'
  })
  .where(eq(events.id, '123'));
```

### Delete

```typescript
// Delete all
await db.delete(events);

// Delete with condition
await db.delete(events).where(eq(events.id, '123'));

// Delete multiple
await db.delete(events).where(
  inArray(events.id, ['1', '2', '3'])
);
```

### Where Conditions

```typescript
import { eq, ne, gt, gte, lt, lte, like, and, or } from 'drizzle-orm';

// Equals
.where(eq(events.id, '123'))

// Not equals
.where(ne(events.status, 'cancelled'))

// Greater than
.where(gt(events.startDate, Date.now()))

// Like (pattern matching)
.where(like(events.name, '%conference%'))

// Multiple conditions (AND)
.where(and(
  eq(events.status, 'active'),
  gt(events.startDate, Date.now())
))

// Multiple conditions (OR)
.where(or(
  eq(events.status, 'active'),
  eq(events.status, 'pending')
))
```

### Joins

```typescript
// Left join
const results = await db
  .select()
  .from(events)
  .leftJoin(users, eq(events.userId, users.id));

// Inner join
const results = await db
  .select()
  .from(events)
  .innerJoin(users, eq(events.userId, users.id));

// Select specific fields from joined tables
const results = await db
  .select({
    eventName: events.name,
    userName: users.name
  })
  .from(events)
  .leftJoin(users, eq(events.userId, users.id));
```

### Transactions

```typescript
await locals.db.transaction(async (tx) => {
  await tx.insert(users).values({ id: '1', name: 'Alice' });
  await tx.insert(events).values({ id: '1', userId: '1', name: 'Event' });
  // Both succeed or both fail
});
```

## Schema Migration Workflow

```bash
# 1. Edit schema
code src/lib/server/db/schema.ts

# 2. Generate migration
bun run db:generate
# Creates: drizzle/0001_migration_name.sql

# 3. Review generated SQL
cat drizzle/0001_*.sql

# 4. Apply locally
bunx wrangler d1 migrations apply DB --local

# 5. Test changes
bun run dev

# 6. Commit migration
git add drizzle/
git commit -m "Add new table"

# 7. Apply to production
bunx wrangler d1 migrations apply DB --remote
```

## Direct Database Access

### Local Database

```bash
# Find database file
D1_DB=$(find .wrangler -name "*.sqlite" | head -n 1)

# Query
sqlite3 "$D1_DB" "SELECT * FROM events;"

# Insert
sqlite3 "$D1_DB" "INSERT INTO events (id, name, start_date) VALUES ('1', 'Test', $(date +%s));"

# List tables
sqlite3 "$D1_DB" ".tables"

# Show schema
sqlite3 "$D1_DB" ".schema events"
```

### Production Database

```bash
# List tables
bunx wrangler d1 execute DB --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table';"

# Query data
bunx wrangler d1 execute DB --remote --command \
  "SELECT * FROM events LIMIT 5;"

# Run SQL file
bunx wrangler d1 execute DB --remote --file=script.sql
```

## Troubleshooting

### "D1 database binding not found"
- **Cause**: Not using Wrangler
- **Fix**: Use `bun run dev` (not `vite dev`)

### "No such table"
- **Cause**: Migrations not applied
- **Fix**: `bunx wrangler d1 migrations apply DB --local`

### "Database is locked"
- **Cause**: Drizzle Studio or another process is using the database
- **Fix**: Close Studio, restart dev server

### Empty query results
- **Cause**: No data in database
- **Fix**: Insert test data or check you're querying the right database

### Type errors after schema changes
- **Cause**: TypeScript cache out of sync
- **Fix**: `bun run check`

### Port already in use
- **Cause**: Dev server already running
- **Fix**: `lsof -ti:8788 | xargs kill -9`

## Reset Local Environment

```bash
# Nuclear option: delete everything and start fresh
rm -rf .wrangler/ .svelte-kit/ node_modules/
bun install
bun run dev
bunx wrangler d1 migrations apply DB --local
```

## Environment Variables

### Local (.env)

```env
# Optional: Only for Drizzle Studio with remote DB
CLOUDFLARE_ACCOUNT_ID=abc123...
CLOUDFLARE_DATABASE_ID=def456...
CLOUDFLARE_D1_TOKEN=xyz789...

# Add other secrets as needed
API_KEY=your-secret-key
```

### Production

Configure in Cloudflare Dashboard:
- Workers & Pages → Your project → Settings → Environment variables

## Useful Snippets

### Generate UUID

```typescript
const id = crypto.randomUUID();
```

### Current Unix Timestamp

```typescript
const now = Math.floor(Date.now() / 1000);
```

### Check if DB is Available

```typescript
const { locals } = getRequestEvent();
if (!locals.db) {
  throw new Error('Database not available');
}
```

### Conditional Query Building

```typescript
let query = db.select().from(events);

if (filters.name) {
  query = query.where(like(events.name, `%${filters.name}%`));
}

if (filters.startDate) {
  query = query.where(gte(events.startDate, filters.startDate));
}

const results = await query;
```

## Resources

- [STACK.md](./STACK.md) - Architecture overview
- [SvelteKit Docs](https://svelte.dev/docs/kit)
- [Drizzle Docs](https://orm.drizzle.team/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)