# Documentation

Streamlined documentation for the FPA Events application.

## Quick Start

New to the project? Start here:

1. **[SETUP.md](./SETUP.md)** - Get up and running in minutes
2. **[STACK.md](./STACK.md)** - Understand how everything works together
3. **[REFERENCE.md](./REFERENCE.md)** - Quick reference for daily development

## What's What

### SETUP.md
Step-by-step guide to:
- Install and run locally
- Make schema changes
- Deploy to production
- Troubleshoot common issues

### STACK.md
Deep dive into the architecture:
- How SvelteKit, D1, and Drizzle work together
- Remote functions for type-safe data fetching
- Database migrations workflow
- Local vs production differences
- Performance and security considerations

### REFERENCE.md
Quick lookup for:
- Common commands
- Database query patterns
- Remote function examples
- Troubleshooting guide
- Direct database access

## Tech Stack

- **Frontend**: SvelteKit 5, Svelte 5, TailwindCSS 4, bits-ui
- **Backend**: Cloudflare D1 (SQLite), Drizzle ORM
- **Deployment**: Cloudflare Pages/Workers
- **Auth**: Better Auth
- **Dev Tools**: Bun, Wrangler, Drizzle Studio

## Common Commands

```bash
# Start development
bun run dev

# Database
bun run db:generate                          # Generate migration
bunx wrangler d1 migrations apply DB --local    # Apply locally
bunx wrangler d1 migrations apply DB --remote   # Apply to production
bun run db:studio                            # Visual database browser

# Build & Deploy
bun run build                                # Build for production
bunx wrangler pages deploy .svelte-kit/cloudflare
```

## Project Structure

```
fpa-events/
├── src/
│   ├── lib/
│   │   ├── server/db/       # Database schema
│   │   ├── components/      # UI components
│   │   └── *.remote.ts      # Server functions
│   ├── routes/              # Pages
│   └── hooks.server.ts      # DB initialization
├── drizzle/                 # Migrations
├── docs/                    # Documentation
└── wrangler.toml            # Cloudflare config
```

## Key Concepts

### Same Code Everywhere
Your application code is identical in local and production. The platform (Wrangler or Cloudflare) provides the database connection via `platform.env.DB`.

### Type-Safe End-to-End
Define your schema once, get TypeScript types everywhere:
```typescript
// Schema
export const events = sqliteTable('events', { ... });

// Infer types
export type Event = typeof events.$inferSelect;

// Use with full type safety
const events: Event[] = await locals.db.select().from(eventsTable);
```

### Remote Functions
Call server-side code from anywhere with full type safety:
```typescript
// Define once (server-side)
export const getAllEvents = query(async () => { ... });

// Use anywhere (client or server)
const eventsQuery = getAllEvents();
```

## Resources

- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)