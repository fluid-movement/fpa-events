---
title: The app likely connects to Postgres as the superuser and migrates on every start
kind: manual
parent: 01M5A34Z75BVD5BE4AZWWEDCPA
tags:
  - security
---

Deployment audit, 2026-10-19, parent 01M5A34Z75BVD5BE4AZWWEDCPA.

**Vulnerability.** The new app very likely connects to Postgres as the superuser. Its Coolify database ("events-postgres", nr234g3tapphcp539wvuocvp) was created with `postgres_user: postgres`, `postgres_db: postgres`, no init args and no extra environment, so the only login role Coolify provisioned is the superuser, and nothing in the repository creates a second role. The container's start command is `npm run db:migrate && node build` (deployment 0wotsqcticakf1uaehejsj3e), and the container log shows `drizzle-kit migrate` running on every start with the same `DATABASE_URL` the server uses — so whatever role that is must be able to create and alter tables. With a superuser, any SQL injection or server-side code execution in the app becomes full database control, including `COPY ... TO PROGRAM` (command execution in the database container), reading other databases, and creating roles. No SQL injection is known (earlier audits found Drizzle parameterisation throughout); this is defence in depth.

**Where.** src/lib/server/db/index.ts:4-11 (uses DATABASE_URL as is), Coolify app tfneo1jlnfvhzyshhwcovplf start command and env key DATABASE_URL, Coolify database nr234g3tapphcp539wvuocvp. The MCP never returns env values, so the actual user in DATABASE_URL is unconfirmed.

**How to reproduce (class).** Read-only, with authorisation: in the Coolify terminal for the app database, `select current_user, rolsuper from pg_roles where rolname = current_user` after connecting with the app's credentials, or check which user name DATABASE_URL carries (do not paste the URL).

**Severity.** Medium (impact multiplier, no known entry point). Not a go-live blocker.

**Fix.** Create a dedicated owner role for the app's database without SUPERUSER/CREATEROLE/CREATEDB, move the schema objects to it, and point DATABASE_URL at it. Optionally go further: run migrations with a separate owner URL in a pre-deployment command and give the runtime role only DML rights. Record the choice as a decision; keep `.env.test`/dev on whatever is convenient.

## Open questions
