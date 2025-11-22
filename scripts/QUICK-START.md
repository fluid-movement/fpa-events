# Quick Start: Seeding Your Database

## TL;DR

```bash
# 1. Push schema to local database
bun run db:push

# 2. Seed the database
bun run db:seed

# 3. View your data
bun run db:studio
```

That's it! Your `local.db` file now has 100 users, 50 events, schedules, and relationships.

## What You'll Get

- 100 test users (90% regular, 10% admin)
- 50 events with realistic details
- 2-5 schedules per event
- 1-2 magic invitation links per event
- 300 user-event registrations with statuses

## View Your Data

Start Drizzle Studio to browse the seeded data:

```bash
bun run db:studio
```

Open http://localhost:4983 in your browser.

## The Simple Way

This uses the standard Drizzle ORM approach:

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/lib/server/db/schema';

const sqlite = new Database('./local.db');
const db = drizzle(sqlite, { schema });

await seed(db, schema).refine((f) => ({
  // Your seed configuration...
}));
```

No hacks. No path finding. Just Drizzle ORM.

## Need Different Data?

Edit `scripts/seed.ts` and change:
- `count: 100` to adjust number of records
- Arrays for custom event types, locations, names
- `seed: 42` to get different random data (or remove it entirely)

Run `bun run db:seed` again to re-seed.

## Clean Slate?

```bash
# Delete database
rm local.db

# Recreate and seed
bun run db:push
bun run db:seed
```

---

For full documentation, see [README.md](./README.md)