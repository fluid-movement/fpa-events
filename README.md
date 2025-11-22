# FPA Events

A modern event management application built with SvelteKit 5, Cloudflare D1, and Better Auth.

## Stack

### Frontend
- **SvelteKit 5** - Full-stack framework with remote functions
- **Svelte 5** - Reactive UI framework
- **TailwindCSS 4** - Utility-first CSS framework
- **bits-ui** - Headless UI components
- **Lucide Svelte** - Icon library

### Backend & Database
- **Cloudflare D1** - Distributed SQLite database
- **Drizzle ORM** - Type-safe database toolkit
- **Cloudflare Pages** - Deployment platform
- **Wrangler** - Cloudflare development tool

### Authentication
- **Better Auth** - Modern authentication library

### Development
- **Bun** - Fast JavaScript runtime and package manager
- **TypeScript** - Type safety
- **ESLint & Prettier** - Code quality and formatting

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) installed
- A Cloudflare account (for deployment)

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd fpa-events

# Install dependencies
bun install

# Start development server
bun run dev
```

The app will be available at `http://localhost:8788`

### First Time Setup

The local D1 database is created automatically when you run `bun run dev`. 

**To apply your schema to the local database:**

```bash
# Method 1: Using Wrangler (if working)
bunx wrangler d1 migrations apply DB --local

# Method 2: Direct SQLite (if wrangler has issues)
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite < drizzle/0000_classy_pride.sql

# Optional: Seed with test data
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite < scripts/seed-test-data.sql
```

**📖 For detailed setup instructions, see:**
- [D1 & Drizzle Integration Guide](docs/D1-DRIZZLE-INTEGRATION.md) - Complete explanation of how everything works
- [Quick Reference](docs/QUICK-REFERENCE.md) - Common commands and workflows

## Project Structure

```
fpa-events/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   └── db/
│   │   │       ├── schema.ts      # Database schema
│   │   │       └── index.ts       # DB connection
│   │   ├── components/            # Reusable UI components
│   │   └── *.remote.ts            # Remote functions (server-side)
│   ├── routes/                    # SvelteKit routes
│   ├── app.d.ts                   # TypeScript definitions
│   └── hooks.server.ts            # Server initialization
├── drizzle/                       # Database migrations
├── docs/                          # Documentation
├── wrangler.toml                  # Cloudflare configuration
└── drizzle.config.ts              # Drizzle Kit configuration
```

## Key Features

### Remote Functions
This project uses SvelteKit 5's experimental remote functions for type-safe server-client communication:

```typescript
// Define server function in .remote.ts file
export const getAllEvents = query(async () => {
  const { locals } = getRequestEvent();
  return await locals.db.select().from(events);
});

// Use in any component
const eventsQuery = getAllEvents();
```

See [docs/REMOTE-FUNCTIONS.md](docs/REMOTE-FUNCTIONS.md) for details.

### Type-Safe Database
Full type safety from database to UI using Drizzle ORM:

```typescript
// Define schema
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' })
});

// Type-safe queries
const allEvents = await db.select().from(events);
```

## Available Scripts

```bash
# Development
bun run dev              # Start dev server with Wrangler
bun run build            # Build for production
bun run preview          # Preview production build

# Database
bun run db:generate      # Generate migrations from schema
bun run db:studio        # Open Drizzle Studio
bunx wrangler d1 migrations apply DB --local   # Apply migrations locally
bunx wrangler d1 migrations apply DB --remote  # Apply migrations to production

# Code Quality
bun run lint             # Lint code
bun run format           # Format code
bun run check            # Type check
```

## Database Management

### Local Development
```bash
# View local database
bun run db:studio

# Execute SQL commands
bunx wrangler d1 execute DB --local --command "SELECT * FROM events"

# Run SQL file
bunx wrangler d1 execute DB --local --file=script.sql
```

### Production
```bash
# Execute SQL on production
bunx wrangler d1 execute DB --remote --command "SELECT * FROM events"

# Apply migrations to production
bunx wrangler d1 migrations apply DB --remote
```

## Deployment

### Cloudflare Pages
### Production

1. **Create production D1 database** (one-time)
   ```bash
   bunx wrangler d1 create fpa-events-production
   ```

2. **Deploy via Dashboard**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to **Workers & Pages** → **Create application**
   - Connect your Git repository
   - Set build settings:
     - Build command: `bun run build`
     - Build output directory: `.svelte-kit/cloudflare`

3. **Configure D1 Binding in Dashboard**
   - In your Pages project: **Settings** → **Functions** → **D1 Database Bindings**
   - Click **Add binding**:
     - Variable name: `DB` (must match wrangler.toml)
     - D1 database: Select `fpa-events-production`
   - **Save**

4. **Apply migrations to production**
   ```bash
   bunx wrangler d1 migrations apply fpa-events-production --remote
   ```

**Note:** The `database_id` is NOT in `wrangler.toml` - it's configured per environment through the dashboard binding.

See [docs/SETUP.md](docs/SETUP.md) for detailed deployment instructions.

## Environment Variables

This project uses `.env` for local secrets (gitignored):

```bash
# Optional: only needed for Drizzle Studio with remote database
cp .env.example .env
```

For local development with the local D1 database, **no environment variables are required**.

See [docs/ENV-SETUP.md](docs/ENV-SETUP.md) for details.

## Documentation

- **[D1-DRIZZLE-INTEGRATION.md](docs/D1-DRIZZLE-INTEGRATION.md)** - How D1 and Drizzle work together ⭐
- **[QUICK-REFERENCE.md](docs/QUICK-REFERENCE.md)** - Common commands and workflows ⭐
- [SETUP.md](docs/SETUP.md) - Complete setup guide for local and production
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture
- [DATABASE.md](docs/DATABASE.md) - Database schema and management
- [REMOTE-FUNCTIONS.md](docs/REMOTE-FUNCTIONS.md) - Using remote functions
- [ENV-SETUP.md](docs/ENV-SETUP.md) - Environment configuration
- [SECURITY.md](docs/SECURITY.md) - Security best practices

## How It Works

### The Platform Binding System

Cloudflare **injects** the D1 database into your app via `platform.env.DB`:

```
Local Development:
  wrangler.toml → Wrangler → Auto-creates local SQLite → platform.env.DB → Drizzle

Production:
  Dashboard Binding → Remote D1 Database → platform.env.DB → Drizzle
```

**Your application code is identical in both environments!** The platform provides different database instances:
- **Local**: Auto-created SQLite file in `.wrangler/state/v3/d1/`
- **Production**: Remote D1 configured in Cloudflare dashboard

**How Drizzle connects:**
1. Cloudflare provides `platform.env.DB` (D1Database)
2. `hooks.server.ts` wraps it: `createDb(platform.env.DB)`
3. You get type-safe queries: `locals.db.select().from(users)`

📖 **[Read the full explanation in D1-DRIZZLE-INTEGRATION.md](docs/D1-DRIZZLE-INTEGRATION.md)**

## Common Tasks

### Add a New Table
1. Edit `src/lib/server/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Apply locally: `bunx wrangler d1 migrations apply DB --local`
4. Apply to production: `bunx wrangler d1 migrations apply DB --remote`

### Query Data in Code
```typescript
import { getRequestEvent } from '$app/server';
import { events } from '$lib/server/db/schema';

const { locals } = getRequestEvent();
const db = locals.db;

// Type-safe queries
const allEvents = await db.select().from(events);
```

### Reset Local Database
```bash
rm -rf .wrangler/
bun run dev  # Recreates database
bunx wrangler d1 migrations apply DB --local
```

## Troubleshooting

### Common Issues

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions to common problems.

**Quick fixes:**

- **"Unexpected token mport" errors**: Update `vite.config.ts` to exclude problematic packages from optimization
- **"D1 database binding not found"**: Ensure `wrangler.toml` is configured and run `bun run dev`
- **"No such table"**: Run `bunx wrangler d1 migrations apply DB --local`
- **"Database is locked"**: Close Drizzle Studio and restart dev server
- **Corrupted dependencies**: Run `rm -rf node_modules .svelte-kit && bun install`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

[MIT](LICENSE)

## Resources

- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better Auth Documentation](https://better-auth.com/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)