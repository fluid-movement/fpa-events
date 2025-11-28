# FPA Events

A modern event management application built with SvelteKit 5, Turso (libSQL), and Better Auth.

## Stack

### Frontend
- **SvelteKit 5** - Full-stack framework with remote functions
- **Svelte 5** - Reactive UI framework
- **TailwindCSS 4** - Utility-first CSS framework
- **bits-ui** - Headless UI components
- **Lucide Svelte** - Icon library

### Backend & Database
- **Turso** - Edge-hosted libSQL database (SQLite-compatible)
- **Drizzle ORM** - Type-safe database toolkit
- **Cloudflare Workers/Pages** - Deployment platform
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
- A [Turso](https://turso.tech/) account and database
- A Cloudflare account (for deployment)

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd fpa-events

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env and add your Turso credentials

# Generate and apply database migrations
bun run db:generate
bun run db:migrate

# Start development server
bun run dev
```

The app will be available at `http://localhost:5173`

### First Time Setup

1. **Create a Turso database:**
   ```bash
   # Install Turso CLI
   curl -sSfL https://get.tur.so/install.sh | bash
   
   # Login to Turso
   turso auth login
   
   # Create a new database
   turso db create fpa-events
   
   # Get your database URL
   turso db show fpa-events --url
   
   # Create an auth token
   turso db tokens create fpa-events
   ```

2. **Configure environment variables:**
   Edit `.env` and add your Turso credentials:
   ```
   TURSO_DATABASE_URL=libsql://your-database.turso.io
   TURSO_AUTH_TOKEN=your-auth-token-here
   BETTER_AUTH_SECRET=your-secret-key
   BETTER_AUTH_URL=http://localhost:5173
   ```

3. **Apply migrations:**
   ```bash
   bun run db:migrate
   ```

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
bun run dev              # Start dev server
bun run build            # Build for production
bun run preview          # Preview production build locally

# Database
bun run db:generate      # Generate migrations from schema
bun run db:migrate       # Apply migrations to Turso
bun run db:studio        # Open Drizzle Studio
bun run db:seed          # Seed database with test data

# Code Quality
bun run lint             # Lint code
bun run format           # Format code
bun run check            # Type check

# Deployment
bun run deploy           # Deploy to Cloudflare
```

## Database Management

### Using Drizzle Studio
```bash
# Open visual database browser
bun run db:studio
```

### Using Turso CLI
```bash
# Connect to your database shell
turso db shell fpa-events

# Execute SQL commands
turso db shell fpa-events "SELECT * FROM events"

# View database info
turso db show fpa-events

# List all databases
turso db list
```

### Migrations
```bash
# Generate new migration from schema changes
bun run db:generate

# Apply migrations
bun run db:migrate

# View migration status
turso db shell fpa-events ".schema"
```

## Deployment

### Cloudflare Workers/Pages

1. **Set up Cloudflare secrets:**
   ```bash
   # Add Turso credentials as secrets
   wrangler secret put TURSO_DATABASE_URL
   # Paste your database URL when prompted
   
   wrangler secret put TURSO_AUTH_TOKEN
   # Paste your auth token when prompted
   
   wrangler secret put BETTER_AUTH_SECRET
   # Paste your auth secret when prompted
   ```

2. **Deploy via Dashboard:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to **Workers & Pages** → **Create application**
   - Connect your Git repository
   - Set build settings:
     - Build command: `bun run build`
     - Build output directory: `.svelte-kit/cloudflare`

3. **Configure environment variables in Dashboard:**
   - In your Pages project: **Settings** → **Environment variables**
   - Add `BETTER_AUTH_URL` with your production URL (e.g., `https://your-app.pages.dev`)
   - Turso credentials should already be set as secrets

4. **Deploy:**
   ```bash
   bun run deploy
   ```

**Note:** Turso is a managed cloud database - no need to create separate production databases or configure bindings. Just use the same Turso database or create a separate production database for production deployments.

## Environment Variables

Required environment variables (add to `.env` for local development):

```bash
# Turso Database
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:5173  # or your production URL
```

For production, these should be set as Cloudflare secrets (except `BETTER_AUTH_URL` which can be a regular environment variable).

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture
- [DATABASE.md](docs/DATABASE.md) - Database schema and management
- [REMOTE-FUNCTIONS.md](docs/REMOTE-FUNCTIONS.md) - Using remote functions (if applicable)
- [SECURITY.md](docs/SECURITY.md) - Security best practices

## How It Works

### Turso + Drizzle Integration

This app uses **Turso** (a distributed libSQL database) with **Drizzle ORM** deployed on **Cloudflare Workers/Pages**:

```
Local Development:
  .env → Turso Database → Drizzle ORM → Type-safe queries

Production:
  Cloudflare Secrets → Turso Database → Drizzle ORM → Type-safe queries
```

**Connection Flow:**
1. Environment variables provide Turso credentials (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`)
2. `hooks.server.ts` creates database connection: `getDb(url, token)`
3. Connection is available as `event.locals.db` throughout your app
4. You get type-safe queries: `locals.db.select().from(users)`

**Benefits:**
- Single database for all environments (or separate DBs for dev/prod)
- No platform-specific bindings needed
- Works with any hosting provider
- Built-in replication and edge caching with Turso

## Common Tasks

### Add a New Table
1. Edit `src/lib/server/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Apply migration: `bun run db:migrate`

### Query Data in Code
```typescript
import { getRequestEvent } from '$app/server';
import { events } from '$lib/server/db/schema';

const { locals } = getRequestEvent();
const db = locals.db;

// Type-safe queries
const allEvents = await db.select().from(events);
```

### Reset Database
```bash
# Drop and recreate your Turso database
turso db destroy fpa-events
turso db create fpa-events
bun run db:migrate
```

## Troubleshooting

### Common Issues

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions to common problems.

**Quick fixes:**

- **"TURSO_DATABASE_URL is not set"**: Check your `.env` file has the correct Turso credentials
- **"No such table"**: Run `bun run db:migrate` to apply migrations
- **"Authentication failed"**: Verify your `TURSO_AUTH_TOKEN` is valid and not expired
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
- [Turso Documentation](https://docs.turso.tech/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better Auth Documentation](https://better-auth.com/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)