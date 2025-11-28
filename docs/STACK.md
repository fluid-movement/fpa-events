# Tech Stack & Architecture

Complete overview of the FPA Events application architecture and how everything works together.

## Stack Overview

### Frontend
- **SvelteKit 5** - Full-stack framework with file-based routing
- **Svelte 5** - Reactive UI framework with runes
- **TailwindCSS 4** - Utility-first CSS framework
- **bits-ui** - Headless UI components

### Backend
- **Cloudflare D1** - Distributed SQLite database at the edge
- **Drizzle ORM** - Type-safe database queries
- **Better Auth** - Authentication library

### Deployment
- **Cloudflare Pages** - Static site hosting
- **Cloudflare Workers** - Serverless functions at the edge
- **Wrangler** - CLI for Cloudflare development

### Dev Tools
- **Bun** - Fast JavaScript runtime and package manager
- **Drizzle Studio** - Visual database browser
- **TypeScript** - Type safety throughout

## How It All Works Together

### Local Development Flow

```
bun run dev
  ↓
Wrangler starts (port 8788)
  ↓
Creates local D1 database (.wrangler/state/v3/d1/*.sqlite)
  ↓
SvelteKit hooks.server.ts initializes Drizzle
  ↓
Database available as locals.db in all server code
  ↓
Remote functions provide type-safe data fetching
  ↓
Components render with full type safety
```

### Production Flow

```
Code pushed to GitHub
  ↓
Cloudflare Pages builds project
  ↓
Cloudflare Workers runtime provides platform.env.DB
  ↓
SvelteKit hooks.server.ts initializes Drizzle
  ↓
Database available as locals.db (same as local!)
  ↓
Remote functions work identically
  ↓
Deployed globally on Cloudflare's edge network
```

**Key insight**: Your application code is identical in both environments. The platform provides the right database connection.

## Database Architecture

### Schema Definition (src/lib/server/db/schema.ts)

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
});

// Infer TypeScript types from schema
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

### Database Initialization (src/hooks.server.ts)

```typescript
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '$lib/server/db/schema';

export const handle: Handle = async ({ event, resolve }) => {
  const client = createClient({
    url: event.platform.env.TURSO_DATABASE_URL,
    authToken: event.platform.env.TURSO_AUTH_TOKEN
  });
  event.locals.db = drizzle(client, { schema });
  return resolve(event);
};
```

### Drizzle ORM vs Drizzle Kit

**Drizzle ORM** (Runtime):
- Used by your application at runtime
- Wraps Turso database to provide type-safe queries
- Works in both local and production
- Accessed via `locals.db`

**Drizzle Kit** (Dev Tools):
- Used during development only
- Provides `db:studio` (visual database browser)
- Provides `db:generate` (migration generator)
- Never used in production

## Remote Functions (Data Fetching)

SvelteKit 5's experimental feature for type-safe server/client communication.

### Define Server Function (src/lib/events.remote.ts)

```typescript
import { query, mutation } from '$app/server';
import { getRequestEvent } from '$app/server';
import { events } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';

// Query: Read data
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

// Mutation: Write data
export const createEvent = mutation(
  v.object({
    name: v.string(),
    startDate: v.number(),
    endDate: v.optional(v.number())
  }),
  async (data) => {
    const { locals } = getRequestEvent();
    const id = crypto.randomUUID();
    await locals.db.insert(events).values({ id, ...data });
    return { id };
  }
);
```

### Use in Components (src/routes/events/+page.svelte)

```svelte
<script lang="ts">
  import { getAllEvents, createEvent } from '$lib/events.remote';
  
  const eventsQuery = getAllEvents();
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

<button onclick={() => createEvent({ name: 'New Event', startDate: Date.now() })}>
  Create Event
</button>
```

### Benefits

- ✅ Full type safety from database to UI
- ✅ No manual API routes needed
- ✅ Works on server and client
- ✅ Automatic loading/error states
- ✅ Built-in validation with Standard Schema

## Database Migrations

### Workflow

```bash
# 1. Edit schema
code src/lib/server/db/schema.ts

# 2. Generate migration file
bun run db:generate

# 3. Apply to local database
bunx wrangler d1 migrations apply DB --local

# 4. Test changes
bun run dev

# 5. Commit migration files
git add drizzle/
git commit -m "Add new table"

# 6. Apply to production
bunx wrangler d1 migrations apply DB --remote
```

### Migration Files

Generated in `drizzle/` directory:

```sql
-- drizzle/0001_create_events.sql
CREATE TABLE `events` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `start_date` integer NOT NULL,
  `end_date` integer,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);
```

## Configuration Files

### wrangler.toml (Cloudflare Configuration)

```toml
name = "fpa-events"
compatibility_date = "2024-01-01"
pages_build_output_dir = ".svelte-kit/cloudflare"

[[ d1_databases ]]
binding = "DB"                                    # Variable name in code
database_name = "fpa-events-local"                # Logical name
database_id = "20a892bb-9a93-4f92-ae34-86e78c3f3808"
migrations_dir = "drizzle"                        # Where migrations are stored
```

### drizzle.config.ts (Drizzle Kit Configuration)

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  },
  out: './drizzle'
});
```

### svelte.config.js (SvelteKit Configuration)

```javascript
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter(),
    experimental: {
      remoteFunctions: true  // Enable remote functions
    }
  }
};
```

## Type Safety Flow

```
1. Define Schema (schema.ts)
   export const events = sqliteTable('events', { ... });

2. Infer Types
   export type Event = typeof events.$inferSelect;

3. Type-safe Queries (events.remote.ts)
   const result: Event[] = await db.select().from(events);

4. Type-safe Remote Functions
   export const getAllEvents = query(async () => result);

5. Type-safe Components
   const eventsQuery = getAllEvents();
   // eventsQuery.current has type: Event[] | undefined
```

## Project Structure

```
fpa-events/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   └── db/
│   │   │       ├── schema.ts      # Database schema (source of truth)
│   │   │       └── index.ts       # DB connection setup
│   │   ├── components/            # UI components
│   │   └── *.remote.ts            # Remote functions (server-side)
│   ├── routes/                    # SvelteKit routes
│   │   ├── +layout.svelte         # Root layout
│   │   └── events/
│   │       └── +page.svelte       # Events page
│   ├── app.d.ts                   # Type definitions
│   ├── app.html                   # HTML template
│   └── hooks.server.ts            # Server initialization
├── drizzle/                       # Database migrations (auto-generated)
├── scripts/                       # Utility scripts
├── static/                        # Static assets
├── .wrangler/                     # Local dev database (gitignored)
├── wrangler.toml                  # Cloudflare config
├── drizzle.config.ts              # Drizzle Kit config
├── svelte.config.js               # SvelteKit config
└── package.json                   # Dependencies
```

## Development vs Production

| Aspect | Local Development | Production |
|--------|------------------|------------|
| **Database** | SQLite file in `.wrangler/` | Cloudflare D1 (distributed) |
| **Provided by** | Wrangler CLI | Cloudflare runtime |
| **Connection** | `platform.env.DB` | `platform.env.DB` |
| **Configuration** | `wrangler.toml` | Cloudflare Dashboard |
| **Your code** | `locals.db` | `locals.db` (identical!) |
| **Migrations** | `--local` flag | `--remote` flag |

## Common Patterns

### Query with Filters

```typescript
export const searchEvents = query(
  v.object({
    name: v.optional(v.string()),
    startDate: v.optional(v.number())
  }),
  async (filters) => {
    const { locals } = getRequestEvent();
    let query = locals.db.select().from(events);
    
    if (filters.name) {
      query = query.where(like(events.name, `%${filters.name}%`));
    }
    
    if (filters.startDate) {
      query = query.where(gte(events.startDate, filters.startDate));
    }
    
    return await query;
  }
);
```

### Transactions

```typescript
await locals.db.transaction(async (tx) => {
  const userId = await tx.insert(users).values({ name: 'Alice' }).returning();
  await tx.insert(events).values({ userId, name: 'Event' });
  // Both succeed or both fail
});
```

### Joins

```typescript
const results = await locals.db
  .select({
    event: events,
    user: users
  })
  .from(events)
  .leftJoin(users, eq(events.userId, users.id));
```

## Performance

### Edge Computing Benefits
- **Low latency** - Runs close to users globally
- **Fast cold starts** - Workers start in <1ms
- **Automatic scaling** - Handles any load
- **Global caching** - D1 data replicated worldwide

### Best Practices
- Use indexes for frequently queried fields
- Batch database operations when possible
- Leverage Cloudflare's caching
- Minimize data transfer with selective queries

## Security

### Environment Variables
- **Local**: `.env` file (gitignored)
- **Production**: Cloudflare Dashboard
- **Never commit**: API keys, tokens, passwords

### Database Access
- D1 only accessible via Cloudflare runtime
- No direct external access
- Requires Cloudflare authentication
- Database IDs in `wrangler.toml` are safe to commit

## Debugging

### Check Database Connection

```typescript
// Add to any server function
const { locals } = getRequestEvent();
console.log('DB available:', !!locals.db);
```

### Inspect Local Database

```bash
# Find database file
find .wrangler -name "*.sqlite"

# Query directly
sqlite3 .wrangler/state/v3/d1/*/*.sqlite "SELECT * FROM events;"

# Use Drizzle Studio
bun run db:studio
```

### View Migration Status

```bash
# Local
bunx wrangler d1 migrations list DB --local

# Production
bunx wrangler d1 migrations list DB --remote
```

## Key Takeaways

1. **Same code everywhere** - `locals.db` works identically in local and production
2. **Type-safe end-to-end** - From database schema to UI components
3. **Remote functions** - No manual API routes needed
4. **Drizzle ORM** - Runtime query builder (used by your app)
5. **Drizzle Kit** - Dev tools (not used in production)
6. **Wrangler** - Manages local D1 database
7. **Migrations** - Version control for database schema
8. **Edge deployment** - Fast, global, automatically scaled

## Resources

- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Better Auth Documentation](https://better-auth.com/)