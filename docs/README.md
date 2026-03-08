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
- Set up PostgreSQL
- Make schema changes
- Deploy to Coolify
- Troubleshoot common issues

### STACK.md

Deep dive into the architecture:

- How SvelteKit, PostgreSQL, and Drizzle work together
- Database migrations workflow
- Local vs production differences

### REFERENCE.md

Quick lookup for:

- Common commands
- Database query patterns
- Troubleshooting guide

## Tech Stack

- **Frontend**: SvelteKit 5, Svelte 5, TailwindCSS 4, bits-ui
- **Backend**: PostgreSQL, Drizzle ORM
- **Deployment**: Coolify VPS (adapter-node)
- **Auth**: Better Auth
- **Dev Tools**: npm, Drizzle Studio

## Common Commands

```bash
# Start development
npm run dev

# Database
npm run db:generate      # Generate migration
npm run db:push          # Apply schema to database
npm run db:studio        # Visual database browser

# Build & Preview
npm run build            # Build for production
npm run preview          # Preview (runs node build)
```

## Project Structure

```
fpa-events/
├── src/
│   ├── lib/
│   │   ├── server/db/       # Database schema & connection
│   │   ├── components/      # UI components
│   │   └── server/          # Server-only code
│   ├── routes/              # Pages
│   └── hooks.server.ts      # Server initialization
├── docs/                    # Documentation
└── drizzle.config.ts        # Drizzle config
```

## Resources

- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better Auth Documentation](https://better-auth.com/)
- [Coolify Documentation](https://coolify.io/docs/)
