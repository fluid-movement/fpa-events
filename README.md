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

The local D1 database is created automatically when you run `bun run dev`. To seed it with test data:

```bash
# Apply migrations
bunx wrangler d1 migrations apply DB --local

# Or seed with test data
bunx wrangler d1 execute DB --local --file=scripts/seed-test-data.sql
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

1. **Build the project**
   ```bash
   bun run build
   ```

2. **Deploy via Dashboard**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to **Workers & Pages** → **Create application**
   - Connect your Git repository
   - Set build settings:
     - Build command: `bun run build`
     - Build output directory: `.svelte-kit/cloudflare`

3. **Configure D1 Binding**
   - In your Pages project: **Settings** → **Functions**
   - Add D1 database binding:
     - Variable name: `DB`
     - Select your production database

4. **Apply migrations**
   ```bash
   bunx wrangler d1 migrations apply DB --remote
   ```

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

- [SETUP.md](docs/SETUP.md) - Complete setup guide for local and production
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - How Drizzle and D1 work together
- [DATABASE.md](docs/DATABASE.md) - Database schema and management
- [REMOTE-FUNCTIONS.md](docs/REMOTE-FUNCTIONS.md) - Using remote functions
- [ENV-SETUP.md](docs/ENV-SETUP.md) - Environment configuration
- [SECURITY.md](docs/SECURITY.md) - Security best practices

## How It Works

### Local Development
```
bun run dev
  ↓
Wrangler Pages Dev (port 8788)
  ↓
Vite Dev Server (port 5173)
  ↓
D1 Binding → Local SQLite (.wrangler/state/)
```

### Production
```
Cloudflare Pages/Workers
  ↓
Compiled SvelteKit App
  ↓
D1 Binding → Cloudflare D1 (configured in dashboard)
```

Your application code is **identical** in both environments. The platform provides the database connection.

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