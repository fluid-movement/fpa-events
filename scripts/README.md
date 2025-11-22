# Database Seeding

This directory contains scripts for seeding your local development database with test data using `drizzle-seed`.

## Quick Start

```bash
# 1. Push your schema to the local database
bun run db:push

# 2. Seed the database
bun run db:seed

# 3. View the data in Drizzle Studio
bun run db:studio
```

That's it! Your `local.db` file now has test data.

## How It Works

The seed script uses Drizzle ORM with `better-sqlite3` to connect to a local SQLite database file (`local.db`). This is the standard Drizzle approach - no hacks, no path finding, just a simple database connection.

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/lib/server/db/schema';

const sqlite = new Database('./local.db');
const db = drizzle(sqlite, { schema });

await seed(db, schema, { seed: 42 }).refine((f) => ({
  // ... your seed configuration
}));
```

## What Gets Seeded

- **100 Users**
  - 90% regular users, 10% admins
  - Realistic names and email addresses
  - 80% with verified emails
  - Test password: `$2a$10$YourHashedPasswordHere`

- **50 Events**
  - Various event types (conferences, workshops, meetups, etc.)
  - Realistic locations and descriptions
  - 70% have event pictures with dimensions
  - Dates spread throughout 2024

- **~150-250 Schedules**
  - Each event has 2-5 schedule items
  - Different session types (keynotes, workshops, breaks, etc.)
  - Some with specific locations and GPS coordinates

- **~50-100 Magic Links**
  - Each event has 1-2 magic invitation links
  - Expiration dates set in the future

- **300 Event-User Relationships**
  - Users registered for various events
  - Status distribution:
    - 50% confirmed
    - 20% pending
    - 20% maybe
    - 10% declined

## Reproducible Data

The script uses a fixed seed (`seed: 42`), so you'll get the same data every time you run it. This is useful for:

- Consistent testing
- Debugging
- Sharing test scenarios with team members

To get different random data, change the seed value in `seed.ts`:

```typescript
await seed(db, schema, { seed: 123 }).refine((f) => ({ ... }));
```

Or remove the seed parameter for random data each time:

```typescript
await seed(db, schema).refine((f) => ({ ... }));
```

## Resetting the Database

To start fresh:

```bash
# Delete the database file
rm local.db

# Recreate schema and seed
bun run db:push
bun run db:seed
```

## Customizing the Seed Data

The seed script (`seed.ts`) is fully customizable. You can:

- Change the number of records by modifying the `count` property
- Update the arrays for event types, locations, names, etc.
- Adjust weighted distributions for different scenarios
- Add new generator functions from `drizzle-seed`

### Available Generators

Some useful generators from `drizzle-seed`:

- **Names**: `firstName()`, `lastName()`, `fullName()`
- **Contact**: `email()`, `phoneNumber({ template: "(###) ###-####" })`
- **Business**: `companyName()`, `jobTitle()`
- **Location**: `streetAddress()`, `city()`, `state()`, `country()`, `postcode()`
- **Numbers**: `int({ minValue, maxValue })`, `number({ minValue, maxValue, precision })`
- **Dates**: `date({ minDate, maxDate })`
- **Text**: `loremIpsum()`
- **Arrays**: `valuesFromArray({ values: [...] })`
- **Weighted**: `weightedRandom([{ weight, value }, ...])`

### Example: Changing User Count

```typescript
users: {
  count: 500,  // Changed from 100 to 500
  columns: {
    name: f.fullName(),
    email: f.email(),
    // ...
  }
}
```

### Example: Adding Custom Event Types

```typescript
events: {
  columns: {
    name: f.valuesFromArray({
      values: [
        'My Custom Event',
        'Another Event Type',
        'Special Workshop',
        // Add more here...
      ]
    }),
    // ...
  }
}
```

## Local vs Production

**Important**: This seeding script is for **local development only**. It uses `better-sqlite3` to connect to a local SQLite file.

- **Local development**: Uses `local.db` file with `better-sqlite3`
- **Production**: Uses Cloudflare D1 (configured in `wrangler.toml`)

The two databases are separate. Production uses Cloudflare D1, which you should manage through:
- Cloudflare dashboard
- `wrangler d1` commands
- Production migrations

## Troubleshooting

### "table X already exists"

The database already has tables. Either:
- Delete `local.db` and run `bun run db:push` again
- Or, if you want to add more data without clearing, manually delete rows first

### TypeScript Errors

Make sure all dependencies are installed:

```bash
bun install
```

### "Database is locked"

Make sure:
- You're not running the dev server or Drizzle Studio
- No other processes are accessing `local.db`
- Close any database viewers

## Learn More

- [drizzle-seed Documentation](https://orm.drizzle.team/docs/seed-overview)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)