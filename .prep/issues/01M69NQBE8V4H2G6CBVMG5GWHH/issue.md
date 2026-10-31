---
title: Replace DBngin with Docker Compose Postgres and a just up recipe
kind: code
tags:
  - devex
---

Replace DBngin with a small Docker setup (OrbStack is always running on the owner's Mac) and a justfile whose `up` recipe brings the whole local dev environment up in one command. The owner wants it simple, idempotent, and easy to extend with more services later.

Existing DBngin dev data is ephemeral: no migration, start fresh from the seed.

## Scope

1. `compose.yaml` (repo root)
   - One `postgres:18` service (prod major could not be read from Coolify; local DBngin was 18.4 — keep `18`), top-level `name: fpa-events` so the project/volume never collides with other repos.
   - Port `5432:5432`, named volume for data, `pg_isready` healthcheck.
   - Credentials match `.env.example` exactly.
   - An init script (mounted into `/docker-entrypoint-initdb.d/`) creates both `fpa_events` (dev) and `fpa_events_test` (integration tests; the test helpers refuse DB names without "test").
2. `.env.example`: `DATABASE_URL` points at the compose DB, database name `fpa_events` (currently wrong: `user:password@…/fpa_events`). Copying it must give a working dev setup. Do not touch `.env.test` unless its URL must change to match the compose credentials — if so, update it too (it is committed and holds no secrets).
3. `justfile`, recipes:
   - `default` → `just --list`.
   - `up`, idempotent, safe to rerun:
     1. If `docker info` fails, run `orb start` (OrbStack), else fail with a clear message.
     2. If `.env` is missing: copy `.env.example` and fill `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Never overwrite an existing `.env`.
     3. If port 5432 is held by something other than this compose project's container (e.g. DBngin), stop with a clear message naming the likely culprit.
     4. `docker compose up -d --wait`.
     5. Install deps only when `node_modules` is missing or older than `package-lock.json`.
     6. Run dev migrations every time (`npm run db:migrate`).
     7. Seed only when the dev DB is empty (no rows in the users/user table — check the schema for the right table).
     8. Dev server: if something already listens on 5173, say so and don't start a second one. Otherwise, if `$REX_SESSION` is set, start `npm run dev` in a new Rex pane (see `rex skill show` for the CLI); else run it in the foreground.
   - `down`: `docker compose down` (keeps data).
   - `reset`: asks for confirmation, then `docker compose down -v`, `up -d --wait`, migrate and seed.
   - `psql`: interactive psql inside the container against `fpa_events`.
   - `test-db`: `npm run db:reset:test` against the container's `fpa_events_test`.
   - Use the existing npm scripts (the owner's toolchain preference is Vite+ / `vp`; call the npm scripts, which already route through it, rather than inventing new commands).
4. Docs: update the local setup sections of `README.md` and `AGENTS.md` so local setup reads "install OrbStack/Docker + just, run `just up`". Replace the `createdb fpa_events_test && npm run db:reset:test` one-time setup with `just test-db`. Remove DBngin mentions.

## Out of scope

No production/Coolify changes. No new services beyond Postgres. No tests (pure dev tooling, per AGENTS.md "Testing").

## Notes for the implementer

The owner's DBngin is still running on 5432 on their machine; do not stop it or run `docker compose up` in a way that conflicts. Verify with `just --list`, `just --dry-run up`/shellcheck-style reading, and by running compose on an alternate port only if needed — or leave live verification to the owner. Commit with the `/commit` skill, do not push.

## Open questions
