# Database Guide

Complete guide to database management with Cloudflare D1 and Drizzle ORM in the FPA Events application.

## Overview

This project uses **Cloudflare D1**, a distributed SQLite database running on Cloudflare's edge network, accessed through **Drizzle ORM** for type-safe queries.

## Quick Start

### Local Development

```bash
# Start dev server (creates local database automatically)
bun run dev

# Apply migrations
bunx wrangler d1 migrations apply DB --local

# View database with Drizzle Studio
bun run db:studio
```

### Production Setup

```bash
# Create production database
bunx wrangler d1 create fpa-events-prod

# Apply migrations to production
bunx wrangler d1 migrations apply fpa-events-prod --remote
```

## Database Schema

### Tables

#### users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

#### events
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date INTEGER NOT NULL,  -- Unix timestamp
  end_date INTEGER,              -- Unix timestamp
  max_participants INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

#### event_user (pivot table)
```sql
CREATE TABLE event_user (
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  registered_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### event_magic_links
```sql
CREATE TABLE event_magic_links (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,  -- Unix timestamp
  used INTEGER NOT NULL DEFAULT 0,  -- Boolean (0 or 1)
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
```

#### schedules
```sql
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time INTEGER NOT NULL,  -- Unix timestamp
  end_time INTEGER NOT NULL,    -- Unix timestamp
  location TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
```

## Schema Definition

Location: `src/lib/server/db/schema.ts`

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  location: text('location'),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  maxParticipants: integer('max_participants'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

// Export types
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

## Migrations

### Generate Migration

After modifying `schema.ts`:

```bash
bun run db:generate
```

This creates a migration file in `drizzle/` directory with SQL statements.

### Apply Migrations

**Local database:**
```bash
bunx wrangler d1 migrations apply DB --local
```

**Production database:**
```bash
bunx wrangler d1 migrations apply DB --remote
```

### Migration Files

Migrations are stored in `drizzle/` directory:

```
drizzle/
├── 0000_initial_schema.sql
├── 0001_add_schedules.sql
└── meta/
    ├── _journal.json
    └── 0000_snapshot.json
```

Each migration file contains SQL statements to modify the schema.

## Working with Data

### Type-Safe Queries

```typescript
import { getRequestEvent } from '$app/server';
import { events } from '$lib/server/db/schema';
import { eq, desc, like } from 'drizzle-orm';

const { locals } = getRequestEvent();
const db = locals.db;

// Select all events
const allEvents = await db.select().from(events);

// Select with conditions
const upcomingEvents = await db
  .select()
  .from(events)
  .where(gte(events.startDate, new Date()))
  .orderBy(desc(events.startDate));

// Select one
const event = await db
  .select()
  .from(events)
  .where(eq(events.id, eventId))
  .get();

// Search
const searchResults = await db
  .select()
  .from(events)
  .where(like(events.name, `%${query}%`));
```

### Insert Data

```typescript
// Insert one
await db.insert(events).values({
  id: ulid(),
  name: 'Tech Conference 2024',
  startDate: new Date('2024-06-01'),
  endDate: new Date('2024-06-03')
});

// Insert multiple
await db.insert(events).values([
  { id: ulid(), name: 'Event 1', startDate: new Date() },
  { id: ulid(), name: 'Event 2', startDate: new Date() }
]);
```

### Update Data

```typescript
// Update one
await db
  .update(events)
  .set({ name: 'Updated Name', updatedAt: new Date() })
  .where(eq(events.id, eventId));

// Update with increment
await db
  .update(events)
  .set({ maxParticipants: sql`${events.maxParticipants} + 1` })
  .where(eq(events.id, eventId));
```

### Delete Data

```typescript
// Delete one
await db.delete(events).where(eq(events.id, eventId));

// Delete with conditions
await db
  .delete(events)
  .where(lt(events.endDate, new Date()));
```

### Joins

```typescript
// Join with related tables
const eventsWithUsers = await db
  .select({
    event: events,
    user: users
  })
  .from(events)
  .leftJoin(eventUser, eq(events.id, eventUser.eventId))
  .leftJoin(users, eq(eventUser.userId, users.id));
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  // Both operations succeed or both fail
  const event = await tx.insert(events).values({
    id: ulid(),
    name: 'New Event'
  });
  
  await tx.insert(schedules).values({
    id: ulid(),
    eventId: event.id,
    title: 'Opening Session'
  });
});
```

## Direct SQL Queries

### Query Local Database

```bash
# Execute single command
bunx wrangler d1 execute DB --local \
  --command "SELECT * FROM events LIMIT 5"

# Execute SQL file
bunx wrangler d1 execute DB --local \
  --file scripts/seed-test-data.sql

# Interactive mode
bunx wrangler d1 execute DB --local
```

### Query Production Database

```bash
# Execute command on production
bunx wrangler d1 execute DB --remote \
  --command "SELECT COUNT(*) FROM events"

# Execute SQL file on production
bunx wrangler d1 execute DB --remote \
  --file scripts/production-update.sql
```

### Useful SQL Commands

```sql
-- List all tables
SELECT name FROM sqlite_master WHERE type='table';

-- View table schema
SELECT sql FROM sqlite_master WHERE name='events';

-- Count records
SELECT COUNT(*) FROM events;

-- Export data
SELECT * FROM events;

-- Check indexes
SELECT * FROM sqlite_master WHERE type='index';
```

## Drizzle Studio

Visual database management tool.

### Launch Studio

```bash
bun run db:studio
```

Opens at `http://localhost:4983`

### Features

- ✅ Browse all tables
- ✅ View and edit data
- ✅ Run custom SQL queries
- ✅ Export data
- ✅ View schema and relationships
- ✅ Filter and search records

### Limitations

- Only works with **local** database
- Cannot connect to remote D1 (security restriction)
- For production, use Cloudflare Dashboard or `wrangler` CLI

## Data Types

### SQLite Type Mapping

| Drizzle Type | SQLite Type | TypeScript Type |
|--------------|-------------|-----------------|
| `text()` | TEXT | string |
| `integer()` | INTEGER | number |
| `integer({ mode: 'timestamp' })` | INTEGER | Date |
| `integer({ mode: 'boolean' })` | INTEGER | boolean |
| `real()` | REAL | number |
| `blob()` | BLOB | Buffer |

### Working with Dates

SQLite stores dates as Unix timestamps (seconds since epoch):

```typescript
// Insert - Drizzle handles conversion
await db.insert(events).values({
  startDate: new Date('2024-06-01')  // Automatically converts to timestamp
});

// Query - Returns Date object
const event = await db.select().from(events).get();
console.log(event.startDate); // Date object

// Manual conversion if needed
const timestamp = Math.floor(new Date().getTime() / 1000);
```

### Default Values

```typescript
// Current timestamp
createdAt: integer('created_at', { mode: 'timestamp' })
  .notNull()
  .default(sql`(unixepoch())`)

// Static value
status: text('status').default('pending')

// Auto-increment
id: integer('id').primaryKey({ autoIncrement: true })
```

## Database Management

### Local Database Location

```
.wrangler/state/v3/d1/miniflare-D1DatabaseObject/
```

This directory is automatically created by Wrangler and contains SQLite database files.

### Reset Local Database

```bash
# Delete local database
rm -rf .wrangler/

# Restart dev server (recreates database)
bun run dev

# Re-apply migrations
bunx wrangler d1 migrations apply DB --local
```

### Backup Database

**Local:**
```bash
# Copy the SQLite file
cp .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite backup.db
```

**Production:**
```bash
# Export data via SQL
bunx wrangler d1 execute DB --remote \
  --command "SELECT * FROM events" > backup.sql
```

### Seed Test Data

Create a seed file: `scripts/seed-test-data.sql`

```sql
INSERT INTO events (id, name, start_date, end_date)
VALUES 
  ('01HJ5X...', 'Tech Conference', 1717200000, 1717286400),
  ('01HJ5Y...', 'Workshop', 1717372800, 1717459200);
```

Apply:
```bash
bunx wrangler d1 execute DB --local --file scripts/seed-test-data.sql
```

## Configuration

### wrangler.toml

```toml
[[ d1_databases ]]
binding = "DB"
database_name = "fpa-events-local"
database_id = "20a892bb-9a93-4f92-ae34-86e78c3f3808"
migrations_dir = "drizzle"
```

- `binding`: Variable name in your code (`platform.env.DB`)
- `database_name`: Human-readable name
- `database_id`: Unique identifier (safe to commit)
- `migrations_dir`: Where migration files are stored

### drizzle.config.ts

```typescript
export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'libsql',
  dbCredentials: {
    url: 'file:' + getLocalDbPath()
  }
});
```

Used only by Drizzle Kit (not your application).

## Production Database Setup

### 1. Create Database

```bash
bunx wrangler d1 create fpa-events-prod
```

Note the `database_id` from the output.

### 2. Configure in Cloudflare Dashboard

1. Go to Cloudflare Dashboard
2. Navigate to **Workers & Pages** → Your project
3. Go to **Settings** → **Functions**
4. Add **D1 database binding**:
   - Variable name: `DB`
   - Database: Select `fpa-events-prod`
5. Save

### 3. Apply Migrations

```bash
bunx wrangler d1 migrations apply fpa-events-prod --remote
```

### 4. Verify

```bash
bunx wrangler d1 execute fpa-events-prod --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table'"
```

## Best Practices

### Indexing

Add indexes for frequently queried columns:

```typescript
export const events = sqliteTable('events', {
  // ... columns
}, (table) => ({
  nameIdx: index('name_idx').on(table.name),
  dateIdx: index('date_idx').on(table.startDate)
}));
```

### Transactions

Use transactions for related operations:

```typescript
await db.transaction(async (tx) => {
  await tx.insert(events).values(newEvent);
  await tx.insert(schedules).values(newSchedule);
});
```

### Prepared Statements

Drizzle automatically uses prepared statements for safety and performance.

### Data Validation

Validate before inserting:

```typescript
import * as v from 'valibot';

const EventSchema = v.object({
  name: v.string([v.minLength(3)]),
  startDate: v.date(),
  endDate: v.optional(v.date())
});

const validated = v.parse(EventSchema, data);
await db.insert(events).values(validated);
```

### Avoid N+1 Queries

Use joins instead of multiple queries:

```typescript
// ❌ N+1 Query (bad)
const events = await db.select().from(eventsTable);
for (const event of events) {
  const schedules = await db.select().from(schedulesTable)
    .where(eq(schedulesTable.eventId, event.id));
}

// ✅ Single query with join (good)
const eventsWithSchedules = await db
  .select()
  .from(eventsTable)
  .leftJoin(schedulesTable, eq(eventsTable.id, schedulesTable.eventId));
```

## Troubleshooting

### "No such table"

**Cause**: Migrations haven't been applied.

**Solution**:
```bash
bunx wrangler d1 migrations apply DB --local
```

### "Database is locked"

**Cause**: Another process is accessing the database.

**Solution**:
- Close Drizzle Studio
- Stop other dev servers
- Restart dev server

### "Migration already applied"

**Cause**: Migration was previously applied.

**Solution**: This is normal. Migrations are idempotent.

### Data not showing in production

**Cause**: Local and production databases are separate.

**Solution**: Apply migrations and seed production database.

## Resources

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)