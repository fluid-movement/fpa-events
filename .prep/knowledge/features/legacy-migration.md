---
type: feature
title: Laravel → fpa-events data migration
description: 'The tools/migrate wipe-and-reload migrator: commands, mapping, and what schema changes must update.'
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:47:44Z
scope:
  - tools/migrate
  - src/lib/server/password.ts
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Laravel → fpa-events data migration

A one-off, standalone tool in `tools/migrate/`: its own npm package (TypeScript,
`pg`, S3 SDK), with **no imports from `src/`**. It is configured entirely by env
vars and is meant to be deleted after cutover. `tools/migrate/README.md` is the
operational runbook (env vars, Coolify terminal steps, local testing); this
entry is the design.

The original brief: the Laravel app receives no further changes, so its schema
is fixed. The new app must take over **all** users, events and their
associations (organizers, RSVPs, schedules, pictures) with no data loss,
re-runnable for testing until the switch, so that users see the same data on
the new site.

## Commands (all idempotent)

| Command                          | File              | Does                                                                                                                                                                |
| -------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run geocode`                | `src/geocode.ts`  | distinct legacy `events.location` strings → Photon → committed `data/event-locations.json` (only new strings are queried; hand edits survive; `null` = no location) |
| `npm run migrate [-- --dry-run]` | `src/migrate.ts`  | **wipe-and-reload** of the target tables it owns, in one transaction (`WIPE_ORDER`). Dry run rolls back                                                             |
| `npm run migrate:pictures`       | `src/pictures.ts` | copies legacy R2 objects to the target bucket under the same key, skipping ones already present                                                                     |

## Design decisions

- **IDs migrate 1:1.** Both apps use ULID text primary keys, so no remapping
  table is needed, and re-runs produce the same rows and stable picture URLs.
- **Wipe-and-reload in one transaction.** `migrate` deletes every row in the
  target tables it owns (children first, `WIPE_ORDER`) and reinserts from the
  legacy DB, so each run converges on the legacy state. There is no
  partial-update mode. The legacy side is only ever read.
- **Timestamps are copied verbatim.** They are selected `::text` and inserted
  with `::timestamp`, never through a JS `Date`, which would shift them by the
  local offset.
- **Deterministic geocoding.** `geocode` resolves each distinct legacy location
  string once into the committed `data/event-locations.json`. Only missing
  strings are queried, so hand corrections survive. Review the file before
  migrating; Photon returns localized country names.

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
- `event_locations`: built from the mapping-file entries actually referenced,
  deduplicated on (city, country).
- RSVPs: `event_user` statuses are the same strings; the identity PK is
  regenerated. Magic links copy 1:1.
- Schedules: legacy location text becomes a `schedule_locations` venue,
  deduplicated per event on (name, lat, lng) when there are coordinates and on
  name when there are not. No location text means no venue.
- Pictures: `migrate` writes the final target URL; `migrate:pictures` makes it
  true by streaming each object GET-from-legacy, PUT-to-target under the same
  key (R2's cross-bucket `CopyObject` proved unreliable), skipping keys that
  `HeadObject` already finds. The two steps are order-independent.
- Not migrated: sessions, reset tokens, jobs, Pulse, and the unfinished
  competition tables (divisions, rounds, players, results, active_years…).
- Timestamps are copied as text and cast, never through a JS `Date`.

## Rules for schema changes

The tool writes raw SQL, not the Drizzle schema, so a schema change that
touches a migrated table must update the matching `INSERT` in
`src/migrate.ts` (and `WIPE_ORDER` for added or removed tables) **in the same
commit**. A mismatch fails loudly at run time, not silently.

## Verifying a change

Restore a legacy dump locally, migrate into a scratch target DB, run it twice
and compare the two reports: identical reports prove idempotency. The README's
"Testing locally" section has the commands.

## After cutover

Remove the `LEGACY_*` env vars from Coolify and delete `tools/migrate/`. Keep
`src/lib/server/password.ts` (or add a rehash-on-login pass first). The final
legacy dump stays as the archive for everything not migrated.

## Where it runs

Inside the deployed app container via the Coolify terminal, because the DB ports
are firewalled. Target-side env falls back to the app's own names
(`DATABASE_URL`, `R2_*`); legacy-side vars (`LEGACY_DATABASE_URL`,
`LEGACY_R2_*`) are explicit. `npm install` in the container is lost on
redeploy. Run `geocode` locally and commit its output.
