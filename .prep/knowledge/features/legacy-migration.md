---
type: feature
title: Laravel → fpa-events data migration
description: 'The tools/migrate wipe-and-reload migrator: commands, mapping, and what schema changes must update.'
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:47:44Z
scope:
  - tools/migrate
  - docs/migration.md
  - src/lib/server/password.ts
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Laravel → fpa-events data migration

A one-off, standalone tool in `tools/migrate/`: its own npm package (TypeScript,
`pg`, S3 SDK), with **no imports from `src/`**. It is configured entirely by env
vars and is meant to be deleted after cutover. `docs/migration.md` is the
design guide, `tools/migrate/README.md` the runbook and
`docs/migration-requirements.md` the original brief. This entry is the summary
an agent needs before touching the schema.

## Commands (all idempotent)

| Command                          | File              | Does                                                                                                                                                                |
| -------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run geocode`                | `src/geocode.ts`  | distinct legacy `events.location` strings → Photon → committed `data/event-locations.json` (only new strings are queried; hand edits survive; `null` = no location) |
| `npm run migrate [-- --dry-run]` | `src/migrate.ts`  | **wipe-and-reload** of the target tables it owns, in one transaction (`WIPE_ORDER`). Dry run rolls back                                                             |
| `npm run migrate:pictures`       | `src/pictures.ts` | copies legacy R2 objects to the target bucket under the same key, skipping ones already present                                                                     |

## Mapping highlights

- IDs carry over 1:1 (both apps use ULID text keys), which makes re-runs
  deterministic.
- Users: `email_verified` forced to true; the bcrypt hash goes into an
  `account` row (`provider_id = 'credential'`). The app's
  `src/lib/server/password.ts` verifies those hashes and **must stay** while
  any bcrypt hash remains.
- Events: date → midnight timestamp; `picture` → `{R2_PUBLIC_URL}/pictures/<name>`
  (new uploads use `events/<ulid>.<ext>`, so both prefixes are legitimate);
  `event_location_id` comes from the mapping file.
- Schedules: legacy location text becomes a `schedule_locations` venue,
  deduplicated per event.
- Not migrated: sessions, reset tokens, jobs, Pulse, and the unfinished
  competition tables (divisions, rounds, players, results, active_years…).
- Timestamps are copied as text and cast, never through a JS `Date`.

## Rules for schema changes

The tool writes raw SQL, not the Drizzle schema, so a schema change that
touches a migrated table must update the matching `INSERT` in
`src/migrate.ts` (and `WIPE_ORDER` for added or removed tables) **in the same
commit**. A mismatch fails loudly at run time, not silently.

## Where it runs

Inside the deployed app container via the Coolify terminal, because the DB ports
are firewalled. Target-side env falls back to the app's own names
(`DATABASE_URL`, `R2_*`); legacy-side vars (`LEGACY_DATABASE_URL`,
`LEGACY_R2_*`) are explicit. `npm install` in the container is lost on
redeploy. Run `geocode` locally and commit its output.
