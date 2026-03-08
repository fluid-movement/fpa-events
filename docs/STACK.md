# Tech Stack & Architecture

Complete overview of the FPA Events application architecture and how everything works together.

## Stack Overview

### Frontend

- **SvelteKit 5** - Full-stack framework with file-based routing
- **Svelte 5** - Reactive UI framework with runes
- **TailwindCSS 4** - Utility-first CSS framework
- **bits-ui** - Headless UI components

### Backend

- **PostgreSQL** - Relational database
- **Drizzle ORM** - Type-safe database queries
- **Better Auth** - Authentication library

### Deployment

- **Coolify** - Self-hosted VPS deployment (via git push)
- **@sveltejs/adapter-node** - Node.js server adapter

### Dev Tools

- **npm** - Package manager
- **Drizzle Studio** - Visual database browser
- **TypeScript** - Type safety throughout

## How It All Works Together

### Local Development Flow

```
npm run dev
  ↓
SvelteKit dev server (port 5173)
  ↓
Reads DATABASE_URL from .env
  ↓
postgres-js connects to PostgreSQL
  ↓
Drizzle ORM wraps connection
  ↓
db available in server code
  ↓
Components render with full type safety
```

### Production Flow

```
Code pushed to GitHub
  ↓
Coolify detects push, builds project
  ↓
npm run build → node build (adapter-node)
  ↓
DATABASE_URL env var provides connection
  ↓
Drizzle ORM connects to PostgreSQL
  ↓
Node server handles requests
```

## Database Architecture

### Schema Definition (src/lib/server/db/schema.ts)

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	startDate: timestamp('start_date', { mode: 'date' }).notNull(),
	createdAt: timestamp('created_at', { mode: 'date' }).default(sql`now()`).notNull()
});

// Infer TypeScript types from schema
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

### Database Client (src/lib/server/db/index.ts)

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

### Drizzle ORM vs Drizzle Kit

**Drizzle ORM** (Runtime):

- Used by your application at runtime
- Wraps postgres-js client to provide type-safe queries
- Accessed via the exported `db` instance

**Drizzle Kit** (Dev Tools):

- Used during development only
- Provides `db:studio` (visual database browser)
- Provides `db:generate` (migration generator)
- Never used in production

## Database Migrations

### Workflow

```bash
# 1. Edit schema
code src/lib/server/db/schema.ts

# 2. Generate migration file
npm run db:generate

# 3. Apply to database
npm run db:push

# 4. Test changes
npm run dev

# 5. Commit migration files
git add src/lib/server/db/migrations/
git commit -m "Add new table"
```

## Configuration Files

### drizzle.config.ts (Drizzle Kit Configuration)

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL!
	},
	out: './src/lib/server/db/migrations'
});
```

### svelte.config.js (SvelteKit Configuration)

```javascript
import adapter from '@sveltejs/adapter-node';

export default {
	kit: {
		adapter: adapter({ out: 'build' })
	}
};
```

## Type Safety Flow

```
1. Define Schema (schema.ts)
   export const events = pgTable('events', { ... });

2. Infer Types
   export type Event = typeof events.$inferSelect;

3. Type-safe Queries
   const result: Event[] = await db.select().from(events);

4. Type-safe Components
   // result has type: Event[]
```

## Project Structure

```
fpa-events/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   └── db/
│   │   │       ├── schema.ts      # Database schema (source of truth)
│   │   │       ├── index.ts       # DB connection setup
│   │   │       └── migrations/    # Auto-generated migration files
│   │   └── components/            # UI components
│   ├── routes/                    # SvelteKit routes
│   │   ├── +layout.svelte         # Root layout
│   │   └── events/
│   │       └── +page.svelte       # Events page
│   ├── app.d.ts                   # Type definitions
│   ├── app.html                   # HTML template
│   └── hooks.server.ts            # Server initialization
├── docs/                          # Documentation
├── static/                        # Static assets
├── drizzle.config.ts              # Drizzle Kit config
├── svelte.config.js               # SvelteKit config
└── package.json                   # Dependencies
```

## Development vs Production

| Aspect            | Local Development       | Production (Coolify)    |
| ----------------- | ----------------------- | ----------------------- |
| **Database**      | Local PostgreSQL        | Managed PostgreSQL      |
| **Connection**    | `DATABASE_URL` in .env  | `DATABASE_URL` env var  |
| **Server**        | Vite dev server         | Node.js (adapter-node)  |
| **Build output**  | N/A                     | `build/`                |

## Common Patterns

### Query with Filters

```typescript
import { like, gte, and } from 'drizzle-orm';

const results = await db
	.select()
	.from(events)
	.where(and(
		like(events.name, `%${name}%`),
		gte(events.startDate, new Date())
	));
```

### Transactions

```typescript
await db.transaction(async (tx) => {
	const [user] = await tx.insert(users).values({ name: 'Alice' }).returning();
	await tx.insert(events).values({ userId: user.id, name: 'Event' });
	// Both succeed or both fail
});
```

### Joins

```typescript
const results = await db
	.select({ event: events, user: users })
	.from(events)
	.leftJoin(users, eq(events.userId, users.id));
```

## Security

### Environment Variables

- **Local**: `.env` file (gitignored)
- **Production**: Coolify environment variables panel
- **Never commit**: API keys, tokens, passwords

## Resources

- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better Auth Documentation](https://better-auth.com/)
- [Coolify Documentation](https://coolify.io/docs/)
