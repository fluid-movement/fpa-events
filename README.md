# FPA Events

A modern event management application built with SvelteKit 5, PostgreSQL, and Better Auth.

## Stack

### Frontend

- **SvelteKit 5** - Full-stack framework with file-based routing
- **Svelte 5** - Reactive UI framework
- **TailwindCSS 4** - Utility-first CSS framework
- **bits-ui** - Headless UI components
- **Lucide Svelte** - Icon library

### Backend & Database

- **PostgreSQL** - Relational database
- **Drizzle ORM** - Type-safe database toolkit

### Authentication

- **Better Auth** - Modern authentication library

### Deployment

- **Coolify** - Self-hosted VPS deployment
- **@sveltejs/adapter-node** - Node.js server adapter

### Development

- **npm** - Package manager
- **TypeScript** - Type safety
- **ESLint & Prettier** - Code quality and formatting

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A running PostgreSQL instance

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd fpa-events

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# Apply database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fpa_events

BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:5173
```

## Project Structure

```
fpa-events/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   └── db/
│   │   │       ├── schema.ts      # Database schema
│   │   │       ├── index.ts       # DB connection
│   │   │       └── migrations/    # Auto-generated migrations
│   │   ├── components/            # Reusable UI components
│   │   └── server/                # Server-only code
│   ├── routes/                    # SvelteKit routes
│   ├── app.d.ts                   # TypeScript definitions
│   └── hooks.server.ts            # Server initialization
├── docs/                          # Documentation
└── drizzle.config.ts              # Drizzle Kit configuration
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Database
npm run db:generate      # Generate migrations from schema
npm run db:push          # Apply schema to database
npm run db:studio        # Open Drizzle Studio
npm run db:seed          # Seed database with test data

# Code Quality
npm run lint             # Lint code
npm run format           # Format code
npm run check            # Type check
```

## Deployment (Coolify)

1. **Create a PostgreSQL database** in Coolify or use an external managed DB
2. **Set environment variables** in Coolify:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL`
3. **Apply schema** to production database:
   ```bash
   DATABASE_URL=<prod-url> npm run db:push
   ```
4. **Push to git** — Coolify builds and deploys automatically

Coolify build settings:
- Build command: `npm run build`
- Start command: `node build`

## Documentation

- [docs/SETUP.md](docs/SETUP.md) - Detailed setup guide
- [docs/STACK.md](docs/STACK.md) - Architecture overview
- [docs/REFERENCE.md](docs/REFERENCE.md) - Quick reference
- [docs/POSTGRES-SETUP.md](docs/POSTGRES-SETUP.md) - PostgreSQL setup guide

## Troubleshooting

- **"DATABASE_URL is not set"**: Check your `.env` file
- **"relation does not exist"**: Run `npm run db:push` to apply schema
- **"Authentication failed"**: Verify `BETTER_AUTH_SECRET` is set
- **Corrupted dependencies**: Run `rm -rf node_modules .svelte-kit && npm install`

## License

[MIT](LICENSE)

## Resources

- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better Auth Documentation](https://better-auth.com/)
- [Coolify Documentation](https://coolify.io/docs/)
