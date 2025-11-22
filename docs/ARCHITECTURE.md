# Architecture Overview

This document explains how the FPA Events application architecture works, focusing on how Drizzle ORM, Cloudflare D1, and SvelteKit work together.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL DEVELOPMENT                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  SvelteKit App                                               │
│    ↓                                                          │
│  Wrangler (provides platform.env.DB)                         │
│    ↓                                                          │
│  Drizzle ORM (wraps D1 binding)                              │
│    ↓                                                          │
│  Local SQLite Database (.wrangler/state/v3/d1/)              │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        PRODUCTION                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  SvelteKit App (Cloudflare Workers)                          │
│    ↓                                                          │
│  Cloudflare Runtime (provides platform.env.DB)               │
│    ↓                                                          │
│  Drizzle ORM (wraps D1 binding)                              │
│    ↓                                                          │
│  Cloudflare D1 (distributed SQLite)                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Drizzle ORM (Runtime)

**Purpose**: Type-safe database queries in your application

**Location**: `src/lib/server/db/index.ts`

```typescript
import { drizzle } from 'drizzle-orm/d1';

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
```

**How it works**:
- Receives a D1 database instance from the platform
- Wraps it to provide a type-safe query interface
- Works identically in local and production environments

**Usage**:
```typescript
const { locals } = getRequestEvent();
const events = await locals.db.select().from(eventsTable);
```

### 2. Drizzle Kit (Development Tools)

**Purpose**: Database management during development

**Location**: `drizzle.config.ts`

**What it provides**:
- `bun run db:studio` - Visual database browser
- `bun run db:generate` - Generate migration files from schema changes
- Direct SQLite file access for development

**How it works**:
- Reads `drizzle.config.ts` to find the local SQLite database file
- Provides CLI tools for schema management
- **Only used during development, never in production**

### 3. Database Connection Flow

#### Initialization (hooks.server.ts)

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  // Platform provides DB binding (Wrangler locally, Cloudflare in prod)
  event.locals.db = createDb(event.platform.env.DB);
  return resolve(event);
};
```

#### Usage in Remote Functions

```typescript
export const getAllEvents = query(async () => {
  const { locals } = getRequestEvent();
  return await locals.db.select().from(events);
});
```

## Configuration Files

### wrangler.toml (D1 Binding)

```toml
[[ d1_databases ]]
binding = "DB"
database_name = "fpa-events-local"
database_id = "20a892bb-9a93-4f92-ae34-86e78c3f3808"
migrations_dir = "drizzle"
```

**Purpose**:
- Defines the D1 binding name (`DB`) that your code uses
- Tells Wrangler which database to use locally
- Committed to git (database IDs are not secrets)

**Used by**:
- Your SvelteKit application (runtime)
- Wrangler CLI commands

### drizzle.config.ts (Drizzle Kit)

```typescript
export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  dialect: 'sqlite',
  driver: 'libsql',
  dbCredentials: {
    url: 'file:' + getLocalDbPath()
  }
});
```

**Purpose**:
- Tells Drizzle Kit where to find the local SQLite database
- Used by `db:studio` and `db:generate` commands

**NOT used by**:
- Your SvelteKit application at runtime

## Data Flow

### Reading Data

```
User Request
  ↓
SvelteKit Route/Remote Function
  ↓
getRequestEvent().locals.db
  ↓
Drizzle ORM Query
  ↓
D1 Database Binding (platform.env.DB)
  ↓
SQLite Database (local or remote)
  ↓
Type-safe Result
```

### Writing Data

```
User Action (form submit, button click)
  ↓
Remote Function (mutation)
  ↓
getRequestEvent().locals.db
  ↓
Drizzle ORM Insert/Update/Delete
  ↓
D1 Database Binding (platform.env.DB)
  ↓
SQLite Database (local or remote)
  ↓
Success/Error Response
```

## Environment Differences

### Local Development
- **Database**: SQLite file in `.wrangler/state/v3/d1/`
- **Provided by**: Wrangler
- **Configuration**: `wrangler.toml`
- **Access**: Direct file access for Drizzle Studio

### Production
- **Database**: Cloudflare D1 (distributed SQLite)
- **Provided by**: Cloudflare runtime
- **Configuration**: Cloudflare dashboard (D1 binding)
- **Access**: Via Cloudflare API only

### What's the Same
Your application code is **100% identical** in both environments:

```typescript
// This works everywhere
const { locals } = getRequestEvent();
const events = await locals.db.select().from(eventsTable);
```

The platform handles providing the correct database connection.

## Database Schema

### Schema Definition

Location: `src/lib/server/db/schema.ts`

```typescript
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
```

### Migrations

```bash
# 1. Edit schema in schema.ts
# 2. Generate migration
bun run db:generate

# 3. Apply to local database
bunx wrangler d1 migrations apply DB --local

# 4. Apply to production
bunx wrangler d1 migrations apply DB --remote
```

Generated migrations are stored in `drizzle/` directory.

## Type Safety

### End-to-End Types

```typescript
// 1. Define schema with types
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  name: text('name').notNull()
});

// 2. Infer types
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

// 3. Type-safe queries
const event: Event = await db.select().from(events).get();

// 4. Type-safe in components
const eventsQuery = getAllEvents(); // Returns Event[]
```

### Remote Functions Type Safety

```typescript
// Server function with typed return
export const getEvent = query(v.string(), async (id) => {
  const event = await locals.db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .get();
  return event; // Type: Event | undefined
});

// Client receives typed data
const eventQuery = getEvent('123');
// eventQuery.current has type: Event | undefined
```

## Performance Considerations

### Local Development
- SQLite file access is very fast
- No network latency
- Suitable for development and testing

### Production
- D1 is distributed across Cloudflare's edge network
- Optimized for read-heavy workloads
- Benefits from edge caching
- Replicates data globally

### Best Practices
- Use indexes for frequently queried fields
- Batch operations when possible
- Use prepared statements (Drizzle handles this)
- Avoid N+1 queries (use joins)

## Common Patterns

### Accessing Database in Remote Functions

```typescript
import { query } from '$app/server';
import { getRequestEvent } from '$app/server';

export const getUsers = query(async () => {
  const { locals } = getRequestEvent();
  return await locals.db.select().from(users);
});
```

### Database Transactions

```typescript
await locals.db.transaction(async (tx) => {
  await tx.insert(users).values({ name: 'Alice' });
  await tx.insert(events).values({ name: 'Event 1' });
  // Both succeed or both fail
});
```

### Conditional Queries

```typescript
const query = locals.db.select().from(events);

if (filters.name) {
  query.where(like(events.name, `%${filters.name}%`));
}

if (filters.startDate) {
  query.where(gte(events.startDate, filters.startDate));
}

const results = await query;
```

## Debugging

### View Database Schema

```bash
bunx wrangler d1 execute DB --local --command \
  "SELECT sql FROM sqlite_master WHERE type='table'"
```

### Query Data Directly

```bash
bunx wrangler d1 execute DB --local --command \
  "SELECT * FROM events LIMIT 5"
```

### Use Drizzle Studio

```bash
bun run db:studio
```

Opens a web UI to browse and edit data visually.

## Summary

The architecture follows these principles:

1. **Platform-agnostic application code** - Works the same everywhere
2. **Type safety from database to UI** - Catch errors at compile time
3. **Simple configuration** - Minimal setup required
4. **Fast local development** - Direct SQLite access
5. **Production-ready** - Leverages Cloudflare's global network

The key insight: **Your code just asks for `platform.env.DB`, and the platform provides the right database connection.** Whether that's a local SQLite file or Cloudflare D1, Drizzle ORM abstracts away the differences.