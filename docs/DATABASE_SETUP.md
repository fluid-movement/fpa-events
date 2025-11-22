# Database Setup

This project uses Cloudflare D1 (SQLite) with Drizzle ORM, supporting both local development and production environments.

## Architecture

The `getDb()` function in `src/lib/server/db/index.ts` automatically selects the database:
- **Local Development**: Uses SQLite file via `DATABASE_URL` environment variable
- **Production**: Uses Cloudflare D1 binding

## Local Development

### Setup

1. Ensure `.env` contains:
```bash
DATABASE_URL=file:local.db
```

2. Apply migrations:
```bash
bun run db:migrate
```

3. (Optional) Seed test data:
```bash
bun run db:seed
```

### Common Commands

```bash
bun run dev              # Start dev server
bun run db:generate      # Generate migration after schema changes
bun run db:migrate       # Apply migrations locally
bun run db:studio        # Open Drizzle Studio (database GUI)
bun run db:seed          # Populate with test data
```

### Making Schema Changes

1. Edit `src/lib/server/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Apply locally: `bun run db:migrate`
4. Test changes
5. Commit migration files

## Production Deployment

### Via Cloudflare Pages (Recommended)

1. Create D1 database:
```bash
wrangler d1 create fpa-events-db
```

2. Apply migrations:
```bash
wrangler d1 migrations apply fpa-events-db --remote
```

3. Deploy:
   - Push code to GitHub
   - Connect repository in Cloudflare Pages dashboard
   - Set build command: `bun run build`
   - Add D1 binding in Settings → Functions → D1 Database Bindings:
     - Variable name: `DB`
     - Database: `fpa-events-db`

### Via Wrangler (Alternative)

1. Add `database_id` to `wrangler.jsonc`:
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "fpa-events-db",
      "database_id": "your-database-id-here",
      "migrations_dir": "./src/lib/server/db/migrations"
    }
  ]
}
```

2. Deploy:
```bash
bun run deploy
```

## Database Schema

- **users** - User accounts and authentication
- **events** - Event information (name, dates, location, description)
- **event_user** - Many-to-many relationship (RSVP status)
- **event_magic_links** - Magic links for event sharing
- **schedules** - Event schedule items with optional geolocation

See `src/lib/server/db/schema.ts` for details.

## Usage in Code

Access database via `event.locals.db` in server-side code:

```typescript
// src/routes/events/+page.server.ts
import type { PageServerLoad } from './$types';
import { events } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
  const allEvents = await locals.db
    .select()
    .from(events)
    .all();
  
  return { events: allEvents };
};
```

## Troubleshooting

**"No database configuration found"**
- Local: Ensure `.env` has `DATABASE_URL=file:local.db`
- Production: Verify D1 binding is configured

**Migrations not applying**
- Check `migrations_dir` in `wrangler.jsonc` points to `./src/lib/server/db/migrations`
- For production, use `--remote` flag

**Type errors after schema changes**
- Run `bun run prepare` to regenerate types

## Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)