# PostgreSQL Setup Guide

This guide covers setting up PostgreSQL for local development and production (Coolify).

## Local Development

### Option A: Docker (recommended)

```bash
docker run -d \
  --name fpa-postgres \
  -e POSTGRES_USER=fpa \
  -e POSTGRES_PASSWORD=fpa \
  -e POSTGRES_DB=fpa_events \
  -p 5432:5432 \
  postgres:16
```

Your `DATABASE_URL`:
```
postgresql://fpa:fpa@localhost:5432/fpa_events
```

Stop/start:
```bash
docker stop fpa-postgres
docker start fpa-postgres
```

### Option B: Native (macOS)

```bash
brew install postgresql@16
brew services start postgresql@16
createdb fpa_events

# Your DATABASE_URL:
# postgresql://localhost/fpa_events
```

### Option C: Native (Ubuntu/Debian)

```bash
sudo apt install postgresql
sudo systemctl start postgresql
sudo -u postgres createdb fpa_events
sudo -u postgres createuser --pwprompt fpa

# Your DATABASE_URL:
# postgresql://fpa:<password>@localhost:5432/fpa_events
```

## Apply Schema

```bash
# Set DATABASE_URL in .env then:
npm run db:push
```

## Production (Coolify)

### Option A: Coolify-managed PostgreSQL

1. In Coolify, go to **Databases** → **New Database** → **PostgreSQL**
2. Choose version (16 recommended)
3. Set a name and password
4. Copy the connection string from the database details page
5. Add as `DATABASE_URL` in your application's environment variables

### Option B: External managed PostgreSQL

Use any managed PostgreSQL provider (Railway, Neon, Supabase, etc.).

1. Create a database and get the connection string
2. Add as `DATABASE_URL` in Coolify's environment variables for your app

### Apply Schema to Production

```bash
DATABASE_URL=<your-prod-url> npm run db:push
```

Or set `DATABASE_URL` temporarily in your local `.env` and run `npm run db:push`.

## Connection String Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

SSL is typically required for managed/cloud databases:
```
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

## Useful psql Commands

```bash
# Connect to database
psql $DATABASE_URL

# List tables
\dt

# Describe table
\d events

# Query
SELECT * FROM events LIMIT 5;

# Exit
\q
```

## Drizzle Studio

```bash
npm run db:studio
```

Opens a visual browser at `https://local.drizzle.studio` to inspect and edit your database.
