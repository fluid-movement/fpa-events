# Quick Reference

Essential commands and patterns for daily development.

## Common Commands

### Development

```bash
npm run dev              # Start dev server (localhost:5173)
npm run build            # Build for production
npm run preview          # Preview production build (node build)
npm run check            # Type check
npm run lint             # Lint code
npm run format           # Format code
```

### Database

```bash
# Generate migration from schema changes
npm run db:generate

# Apply schema to database
npm run db:push

# Open Drizzle Studio (visual database browser)
npm run db:studio

# Seed database
npm run db:seed

# Reset: push schema + seed
npm run db:reset
```

## File Locations

| What              | Where                                     |
| ----------------- | ----------------------------------------- |
| Database schema   | `src/lib/server/db/schema.ts`             |
| DB initialization | `src/lib/server/db/index.ts`              |
| Routes            | `src/routes/`                             |
| Components        | `src/lib/components/`                     |
| Migrations        | `src/lib/server/db/migrations/`           |
| Config            | `drizzle.config.ts`, `svelte.config.js`   |

## Database Schema Patterns

### Define Table

```typescript
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const events = pgTable('events', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	startDate: timestamp('start_date', { mode: 'date' }).notNull(),
	endDate: timestamp('end_date', { mode: 'date' }),
	createdAt: timestamp('created_at', { mode: 'date' }).notNull().default(sql`now()`)
});

// Infer types
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

### Common Column Types

```typescript
text('name');                                          // String
text('email').notNull();                               // Required string
integer('count');                                      // Integer
real('latitude');                                      // Float
boolean('active');                                     // Boolean
timestamp('created_at', { mode: 'date' });             // Date
text('status').default('pending');                     // With default value
integer('id').primaryKey().generatedAlwaysAsIdentity(); // Auto-increment PK
```

### Relationships

```typescript
export const users = pgTable('users', {
	id: text('id').primaryKey()
});

export const events = pgTable('events', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id)
});
```

## Drizzle Query Patterns

### Select

```typescript
// All rows
const all = await db.select().from(events);

// Single row
const [one] = await db.select().from(events).where(eq(events.id, '123')).limit(1);

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
const [result] = await db.insert(events).values({ ... }).returning();
```

### Update

```typescript
// Update with condition
await db.update(events).set({ name: 'Updated' }).where(eq(events.id, '123'));

// Update multiple fields
await db
	.update(events)
	.set({ name: 'Updated', description: 'New description' })
	.where(eq(events.id, '123'));
```

### Delete

```typescript
// Delete with condition
await db.delete(events).where(eq(events.id, '123'));

// Delete multiple
await db.delete(events).where(inArray(events.id, ['1', '2', '3']));
```

### Where Conditions

```typescript
import { eq, ne, gt, gte, lt, lte, like, and, or } from 'drizzle-orm';

.where(eq(events.id, '123'))
.where(ne(events.status, 'cancelled'))
.where(gt(events.startDate, new Date()))
.where(like(events.name, '%conference%'))
.where(and(eq(events.status, 'active'), gt(events.startDate, new Date())))
.where(or(eq(events.status, 'active'), eq(events.status, 'pending')))
```

### Joins

```typescript
// Left join
const results = await db.select().from(events).leftJoin(users, eq(events.userId, users.id));

// Select specific fields from joined tables
const results = await db
	.select({ eventName: events.name, userName: users.name })
	.from(events)
	.leftJoin(users, eq(events.userId, users.id));
```

### Transactions

```typescript
await db.transaction(async (tx) => {
	const [user] = await tx.insert(users).values({ id: '1', name: 'Alice' }).returning();
	await tx.insert(events).values({ id: '1', userId: user.id, name: 'Event' });
	// Both succeed or both fail
});
```

## Schema Migration Workflow

```bash
# 1. Edit schema
code src/lib/server/db/schema.ts

# 2. Generate migration
npm run db:generate
# Creates: src/lib/server/db/migrations/XXXX_*.sql

# 3. Review generated SQL
cat src/lib/server/db/migrations/*.sql

# 4. Apply to database
npm run db:push

# 5. Test changes
npm run dev

# 6. Commit migration
git add src/lib/server/db/migrations/
git commit -m "Add new table"
```

## Environment Variables

### Local (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fpa_events
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:5173
```

### Production (Coolify)

Configure in Coolify's environment variables panel:
- `DATABASE_URL` — production PostgreSQL connection string
- `BETTER_AUTH_SECRET` — secure random string
- `BETTER_AUTH_URL` — your production URL

## Troubleshooting

### "DATABASE_URL is not set"

- Check `.env` has the correct value
- Restart dev server after editing `.env`

### "No such table" / relation does not exist

- Run `npm run db:push` to apply schema
- Verify `DATABASE_URL` points to the right database

### "Database is locked"

- Close Drizzle Studio and restart dev server

### Type errors after schema changes

- Run `npm run check`

## Reset Local Environment

```bash
rm -rf node_modules .svelte-kit
npm install
npm run db:push
```

## Resources

- [STACK.md](./STACK.md) - Architecture overview
- [SvelteKit Docs](https://svelte.dev/docs/kit)
- [Drizzle Docs](https://orm.drizzle.team/)
