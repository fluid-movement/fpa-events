# Documentation

Complete documentation for the FPA Events application.

## Getting Started

- **[SETUP.md](./SETUP.md)** - Complete setup guide for local development and production deployment
- **[ENV-SETUP.md](./ENV-SETUP.md)** - Environment variables and configuration

## Architecture

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - How Drizzle ORM, D1, and SvelteKit work together
- **[REMOTE-FUNCTIONS.md](./REMOTE-FUNCTIONS.md)** - Using SvelteKit 5 remote functions for type-safe data fetching

## Database

- **[DATABASE.md](./DATABASE.md)** - Database management, schema, migrations, and Drizzle Studio

## Security

- **[SECURITY.md](./SECURITY.md)** - Security best practices for secrets and environment variables

## Quick Reference

### Stack

- **Frontend**: SvelteKit 5, Svelte 5, TailwindCSS 4, bits-ui
- **Backend**: Cloudflare D1 (SQLite), Drizzle ORM
- **Deployment**: Cloudflare Pages/Workers
- **Auth**: Better Auth
- **Dev Tools**: Bun, Wrangler, Drizzle Studio

### Common Commands

```bash
# Development
bun run dev              # Start dev server
bun run build            # Build for production
bun run db:studio        # Open Drizzle Studio

# Database
bun run db:generate                         # Generate migration
bunx wrangler d1 migrations apply DB --local   # Apply locally
bunx wrangler d1 migrations apply DB --remote  # Apply to production

# Code Quality
bun run lint             # Lint code
bun run format           # Format code
bun run check            # Type check
```

### Project Structure

```
fpa-events/
├── src/
│   ├── lib/
│   │   ├── server/db/       # Database schema and connection
│   │   ├── components/      # UI components
│   │   └── *.remote.ts      # Remote functions (server-side)
│   ├── routes/              # SvelteKit routes
│   └── hooks.server.ts      # Server initialization
├── drizzle/                 # Database migrations
├── docs/                    # Documentation
├── wrangler.toml            # Cloudflare configuration
└── drizzle.config.ts        # Drizzle Kit configuration
```

## How It Works

### Local Development

```
bun run dev
  ↓
Wrangler (port 8788)
  ↓
Provides platform.env.DB → Local SQLite
  ↓
hooks.server.ts creates Drizzle instance
  ↓
Available as locals.db in all server code
```

### Production

```
Cloudflare Workers/Pages
  ↓
Provides platform.env.DB → Cloudflare D1
  ↓
hooks.server.ts creates Drizzle instance
  ↓
Available as locals.db in all server code
```

**Key insight**: Your application code is identical in both environments. The platform provides the database connection.

## Key Features

### Type-Safe Queries

```typescript
// Define schema
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  name: text('name').notNull()
});

// Type-safe query
const events = await locals.db.select().from(eventsTable);
// Type: { id: string; name: string }[]
```

### Remote Functions

```typescript
// Server function (src/lib/events.remote.ts)
export const getAllEvents = query(async () => {
  const { locals } = getRequestEvent();
  return await locals.db.select().from(events);
});

// Use in component
const eventsQuery = getAllEvents();
// Fully typed, works on server and client
```

### Database Migrations

```bash
# 1. Edit schema
# 2. Generate migration
bun run db:generate

# 3. Apply locally
bunx wrangler d1 migrations apply DB --local

# 4. Apply to production
bunx wrangler d1 migrations apply DB --remote
```

## Configuration Files

### wrangler.toml (Public Config)

```toml
[[ d1_databases ]]
binding = "DB"
database_name = "fpa-events-local"
database_id = "20a892bb-9a93-4f92-ae34-86e78c3f3808"
migrations_dir = "drizzle"
```

- ✅ Safe to commit
- Defines D1 binding for your app
- Database IDs are identifiers, not secrets

### .env (Local Secrets)

```env
# Optional: Only needed for Drizzle Studio with remote DB
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=your-database-id
CLOUDFLARE_D1_TOKEN=your-api-token
```

- 🔒 Never commit (gitignored)
- Only needed for optional features
- Not required for basic local development

### drizzle.config.ts (Drizzle Kit)

```typescript
export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:' + getLocalDbPath()
  }
});
```

- Used by Drizzle Kit tools (Studio, migrations)
- Not used by your application at runtime

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "D1 database binding not found" | Not using Wrangler | Use `bun run dev` not `vite dev` |
| "No such table" | Migrations not applied | `bunx wrangler d1 migrations apply DB --local` |
| "Database is locked" | Drizzle Studio open | Close Studio, restart dev server |
| No data in production | Separate databases | Apply migrations to production |

See individual docs for detailed troubleshooting.

## Resources

- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better Auth Documentation](https://better-auth.com/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

## Contributing

When adding new features:

1. Update schema in `src/lib/server/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Test locally: `bunx wrangler d1 migrations apply DB --local`
4. Create remote function in `*.remote.ts` file
5. Document changes in relevant docs
6. Apply to production: `bunx wrangler d1 migrations apply DB --remote`

## Support

For issues specific to:
- **Cloudflare D1**: [Community Forum](https://community.cloudflare.com/)
- **SvelteKit**: [Discord](https://svelte.dev/chat)
- **Drizzle**: [Discord](https://discord.gg/WcRKz7W5Qd)