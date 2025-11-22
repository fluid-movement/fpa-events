# Architecture: Database Seeding with Drizzle ORM

## The Right Way

This project uses **Drizzle ORM properly** - no hacks, no path manipulation, just clean database connections.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Setup                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  scripts/seed.ts                                             │
│  ├── Uses: better-sqlite3                                    │
│  ├── Connects to: ./local.db                                │
│  └── Purpose: Seed test data for local development          │
│                                                               │
│  drizzle.config.ts                                           │
│  ├── Uses: sqlite dialect                                    │
│  ├── Connects to: ./local.db                                │
│  └── Purpose: Drizzle Kit & Studio                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Production Setup                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  src/lib/server/db/index.ts                                 │
│  ├── Uses: drizzle-orm/d1                                   │
│  ├── Connects to: Cloudflare D1 (env.DB)                   │
│  └── Purpose: Runtime database queries                      │
│                                                               │
│  wrangler.toml                                               │
│  ├── Defines: D1 database binding                           │
│  ├── Name: "DB"                                              │
│  └── Purpose: Cloudflare Workers binding config             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Why This Approach?

### ✅ Follows Drizzle Best Practices

From the official Drizzle documentation:

```typescript
// PostgreSQL example from docs
import { drizzle } from "drizzle-orm/node-postgres";
const db = drizzle(process.env.DATABASE_URL!);
await seed(db, { users });
```

We do the same for SQLite:

```typescript
// Our approach - clean and simple
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('./local.db');
const db = drizzle(sqlite, { schema });
await seed(db, schema);
```

### ✅ Separation of Concerns

- **Local development**: `local.db` file with better-sqlite3
- **Production**: Cloudflare D1 with proper bindings
- No mixing, no confusion, no hacks

### ✅ Standard SQLite Approach

```typescript
// This is how better-sqlite3 is meant to be used
const sqlite = new Database('./path/to/file.db');
const db = drizzle(sqlite);
```

Not:
- ❌ Finding files in `.wrangler` directories
- ❌ Reading directory contents to discover database paths
- ❌ Complex path resolution logic
- ❌ Trying to connect to Wrangler's internal database files

## Database Files

### local.db

- **Location**: Project root (`./local.db`)
- **Purpose**: Local development and testing
- **Created by**: `drizzle-kit push`
- **Used by**: 
  - Seed script (`scripts/seed.ts`)
  - Drizzle Studio (`drizzle-kit studio`)
  - Any local database tools

### Cloudflare D1 (Production)

- **Location**: Cloudflare's edge network
- **Purpose**: Production data
- **Created by**: Cloudflare dashboard or `wrangler d1 create`
- **Used by**: 
  - Your SvelteKit app in production
  - Cloudflare Workers
  - Accessed via `env.DB` binding

## How It All Works Together

### 1. Schema Definition

```typescript
// src/lib/server/db/schema.ts
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  // ...
});
```

Single source of truth for both local and production.

### 2. Local Development

```bash
# Push schema to local.db
bun run db:push

# Seed local.db with test data
bun run db:seed

# Browse local.db in Drizzle Studio
bun run db:studio
```

### 3. Production Deployment

```bash
# Generate migrations
bun run db:generate

# Apply to production D1 (via Cloudflare)
wrangler d1 migrations apply fpa-events-db
```

### 4. Runtime (SvelteKit App)

```typescript
// Local dev: Uses local.db (via Wrangler)
// Production: Uses Cloudflare D1

import { createDb } from '$lib/server/db';

export async function load({ platform }) {
  const db = createDb(platform.env.DB);
  const users = await db.select().from(schema.users);
  // ...
}
```

## Key Principles

### 1. Use the Right Driver for the Job

- **better-sqlite3**: For local files, seeding, testing
- **drizzle-orm/d1**: For Cloudflare D1 in production
- **Don't mix them**: Each has its purpose

### 2. Keep It Simple

```typescript
// Good ✅
const db = drizzle(new Database('./local.db'), { schema });

// Bad ❌
const path = findWranglerDbInComplexWay();
const db = drizzle(new Database(path), { schema });
```

### 3. Follow the Framework

Drizzle ORM expects you to:
1. Create a database connection
2. Pass it to `drizzle()`
3. Use the returned instance

That's it. No magic, no discovery, no hacks.

### 4. Separate Environments

- **Never** try to seed production from a script
- **Never** commit database files
- **Always** use environment-appropriate connections

## Common Patterns

### Seeding

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { seed } from 'drizzle-seed';

const sqlite = new Database('./local.db');
const db = drizzle(sqlite, { schema });

await seed(db, schema).refine((f) => ({
  users: {
    count: 100,
    columns: {
      name: f.fullName(),
      email: f.email()
    }
  }
}));
```

### Querying (Local Development Script)

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('./local.db');
const db = drizzle(sqlite, { schema });

const users = db.select().from(schema.users).all();
console.log(users);
```

### Querying (Production Runtime)

```typescript
import { drizzle } from 'drizzle-orm/d1';

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

// In your load function:
const db = createDb(platform.env.DB);
const users = await db.select().from(schema.users);
```

## Benefits

1. **Standard Drizzle**: Follows official documentation
2. **Predictable**: File is always `./local.db`
3. **Simple**: No complex logic to find databases
4. **Debuggable**: Easy to inspect `local.db` with any SQLite tool
5. **Portable**: Works with any SQLite browser/tool
6. **Clean**: Separates local development from production

## Tools You Can Use

With `local.db` as a standard SQLite file:

- **Drizzle Studio**: Built-in, beautiful UI
- **DB Browser for SQLite**: Popular GUI tool
- **sqlite3 CLI**: Command-line access
- **TablePlus**: Professional database client
- **VS Code extensions**: SQLite viewers
- Any other SQLite-compatible tool

## Summary

This is not about being clever. This is about following **standard practices**:

1. ✅ Use Drizzle ORM as documented
2. ✅ Use better-sqlite3 for local SQLite files
3. ✅ Keep configuration simple and explicit
4. ✅ Separate local development from production
5. ✅ Let each tool do what it does best

**No hacks. No magic. Just clean architecture.**