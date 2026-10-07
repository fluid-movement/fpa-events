---
type: component
title: Database schema, migrations and seed
description: Tables and relations, the migration workflow, and the seed script's rules.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:45:34Z
scope:
  - src/lib/server/db
  - drizzle.config.ts
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Database schema, migrations and seed

Postgres through Drizzle (`postgres` driver). `src/lib/server/db/index.ts`
throws at import when `DATABASE_URL` is unset. Unit tests replace the module
with `src/test/mocks/db.ts`.

## Tables (`schema.ts`)

| Table                                | Key          | Notes                                                                                                                                                                                                                               |
| ------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`                               | text id      | Better Auth table plus app columns: `role` (`user`/`admin`), `calendar_token` (unique), `show_attendance` (default true)                                                                                                            |
| `session`, `account`, `verification` | text id      | Better Auth internals; `account.password` holds the hash                                                                                                                                                                            |
| `events`                             | text ULID    | `user_id` → creator (**no cascade**), `start_date`/`end_date` timestamps, `location` display text, optional `event_location_id` → `event_locations` (set null), HTML `description`, optional `picture` URL + `picture_width/height` |
| `event_user`                         | identity int | `event_id` (cascade), `user_id` (cascade), free-text `status` (`attending` / `organizing`, see `EventUserStatus` in `#lib/types/event`). No unique (event, user) constraint                                                         |
| `event_magic_links`                  | text ULID    | co-organizer invite; `expires_at`; one live link per event by convention                                                                                                                                                            |
| `event_locations`                    | identity int | global city-level points, deduplicated by (city, country) in `findOrCreateEventLocation`                                                                                                                                            |
| `schedule_locations`                 | identity int | per-event venues; `latitude/longitude` nullable                                                                                                                                                                                     |
| `schedules`                          | text ULID    | schedule items; `location_id` → venue (set null), HTML `description`                                                                                                                                                                |

New text ids are `ulid().toLowerCase()`. IDs migrated from Laravel keep
their original form. Drizzle `relations()` are declared for the relational
query API. `userRelations` sits at the bottom because `relations()` evaluates
eagerly.

## Migrations

- `npm run db:generate` turns schema changes into SQL in `migrations/`
  (`drizzle.config.ts`). `0000` is the base, `0001` made venue coordinates
  nullable and added `show_attendance`.
- `npm run db:migrate` applies them; `db:reset` = migrate + seed. The test DB has
  `db:migrate:test` / `db:reset:test`, and the pre-push hook runs the former.
- Production is migrated from the Coolify terminal (DB ports are firewalled).
  See `/architecture/build-and-deploy.md`.

## Seed (`seed.ts`, `npm run db:seed`)

AGENTS.md requires the seed to follow every schema change: new tables in the
teardown (FK-safe order), new columns populated, new statuses covered. It
wipes all event data and only the seed users (`@example.com` and the admin
email), then upserts ~15 users (one admin; several with
`showAttendance: false`), real-city `event_locations`, ~40 events across
2023–2026, RSVPs, organizer seats and schedules. Seed users get no `account`
row, so they cannot sign in. Sign up locally instead, or verify a user by SQL
the way `tests/integration/auth.setup.ts` does.
