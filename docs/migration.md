# Legacy Data Migration — Design & Code Guide

How data moves from the legacy Laravel app (events.freestyledisc.org) into this
app. This documents the **design and code**; the operational runbook (env vars,
Coolify terminal steps, cutover checklist) lives in
[`tools/migrate/README.md`](../tools/migrate/README.md), and the original
requirements in [`migration-requirements.md`](migration-requirements.md).

---

## Overview

The migration is a standalone tool in `tools/migrate/` — its own npm package
(TypeScript, `pg`, `@aws-sdk/client-s3`), zero imports from `src/`, configured
entirely through env vars. It lives in this repo so schema changes and
migration changes ship in the same commit, and it is deleted after cutover.

Three commands, each idempotent and re-runnable in any order after the first
full pass:

| Command                          | Source file       | What it does                                                                     |
| -------------------------------- | ----------------- | -------------------------------------------------------------------------------- |
| `npm run geocode`                | `src/geocode.ts`  | Distinct legacy `events.location` strings → Photon → `data/event-locations.json` |
| `npm run migrate [-- --dry-run]` | `src/migrate.ts`  | Transactional wipe-and-reload of the target DB                                   |
| `npm run migrate:pictures`       | `src/pictures.ts` | Copies event pictures, legacy R2 bucket → target R2 bucket                       |

Supporting modules: `src/db.ts` (env resolution + `pg` pools), `src/report.ts`
(per-table counts + warnings summary), `src/locations.ts` (mapping-file
load/save).

## Core design decisions

**IDs migrate 1:1.** Both apps use ULID text primary keys, so no remapping
table is needed. This is what makes everything idempotent: re-running always
produces the same rows, and picture URLs/keys stay stable across runs.

**Wipe-and-reload, in one transaction.** `migrate` deletes all rows from the
target tables it owns (children before parents, see `WIPE_ORDER`), then
reinserts from the legacy DB. Every run converges to the current state of the
legacy source — there is no partial-update mode to reason about. `--dry-run`
executes the full transaction and rolls back. The legacy side is only ever
read.

**Timestamps are copied verbatim.** Legacy columns are selected with `::text`
and inserted with `::timestamp` casts, so values never round-trip through a JS
`Date` (which would shift them by the local timezone offset).

**Geocoding is deterministic via a committed mapping file.** The new app links
events to `event_locations` (city/country/lat/lng) for the events map; the
legacy app only had a free-text `location`. `geocode` resolves each distinct
string through Photon (the same service the app's `src/lib/geocoding.ts` uses)
into `tools/migrate/data/event-locations.json`, keyed by the exact legacy
string. Only strings missing from the file are queried, so hand corrections
survive re-runs; `null` means "no result" and migrates as an event without a
map location (reported as a warning). The file is committed — review it before
migrating.

## Data mapping

| Legacy (Laravel)                                                                                                                                       | Target (Drizzle)                   | Notes                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                                                                                                                                                | `user`                             | `email_verified` → always `TRUE` (the legacy app never used email verification; established accounts must not be locked out at cutover); `image`/`calendar_token` → null; role values (`user`/`admin`) are identical |
| `users.password`                                                                                                                                       | `account`                          | One row per user: `provider_id = 'credential'`, `account_id = user.id`, bcrypt hash copied verbatim (see below)                                                                                       |
| `events`                                                                                                                                               | `events`                           | `date` → midnight timestamp; `picture` key → full URL `{R2_PUBLIC_URL}/pictures/<name>`; `event_location_id` resolved via the mapping file                                                            |
| —                                                                                                                                                      | `event_locations`                  | Built from mapping-file entries actually referenced, deduped on (city, country)                                                                                                                       |
| `event_user`                                                                                                                                           | `event_user`                       | Statuses (`attending`/`organizing`) are identical; identity PK regenerated                                                                                                                            |
| `event_magic_links`                                                                                                                                    | `event_magic_links`                | 1:1                                                                                                                                                                                                   |
| `schedules`                                                                                                                                            | `schedules` + `schedule_locations` | Any location text → venue row in `schedule_locations`, deduped per event on (name, lat, lng) when coordinates are present and on (name) when they are not; coordinates are nullable, so name-only venues migrate intact; no location text → nothing |
| sessions, password reset tokens, cache/jobs, Pulse, competition tables (`divisions`, `rounds`, `teams`, `pools`, `players`, `results`, `active_years`) | —                                  | Intentionally not migrated; competition feature was never finished and is dropped                                                                                                                     |

## Passwords: the one piece inside the app

Laravel stores bcrypt hashes (`$2y$…`); Better Auth defaults to scrypt. So
migrated users can log in with their existing passwords,
[`src/lib/server/password.ts`](../src/lib/server/password.ts) exports a
`verifyPassword` that detects bcrypt prefixes (`$2a$`/`$2b$`/`$2y$`, normalized
to `$2b$` for `bcryptjs`) and falls back to Better Auth's scrypt verify for
everything else. It is wired into `betterAuth()` via
`emailAndPassword.password` in [`src/lib/server/auth.ts`](../src/lib/server/auth.ts);
new signups still hash with scrypt. Tests: `src/lib/server/password.test.ts`.

This is the only migration-related code that ships with the app, and it must
stay (or be followed by a rehash-on-login pass) for as long as bcrypt hashes
remain in the `account` table.

## Pictures

Legacy `events.picture` stores an R2 key like `pictures/<name>.jpg`; the app
stores a full public URL. `migrate` writes the final target URL into the DB;
`migrate:pictures` makes it true by copying objects **under the same key** —
GET from the legacy bucket, PUT to the target bucket (streamed through the
tool; R2's cross-bucket `CopyObject` support is unreliable). A `HeadObject`
check skips objects already present, so re-runs only transfer new pictures.
The two steps are order-independent.

## Environment resolution

`requireEnv(...names)` in `src/db.ts` takes fallback names. Legacy-side vars
(`LEGACY_DATABASE_URL`, `LEGACY_R2_*`) are always explicit; every target-side
var falls back to the app's own name (`TARGET_DATABASE_URL` → `DATABASE_URL`,
`TARGET_R2_BUCKET_NAME` → `R2_BUCKET_NAME`, …). Consequence: when the tool
runs inside the deployed app container — the normal server workflow, since the
databases are only reachable from the VPS docker network — the target side
needs zero configuration. `dotenv` loads `tools/migrate/.env` when present
(local runs) and no-ops otherwise.

## Extending or modifying

- **App schema changed?** Update the corresponding `INSERT` in
  `src/migrate.ts` (and `WIPE_ORDER` if tables were added/removed) in the same
  commit. The migration is raw SQL on purpose — it does not import the Drizzle
  schema, so nothing breaks silently; a mismatch fails loudly at run time.
  Re-run `npm run migrate` afterwards; wipe-and-reload absorbs any change.
- **New legacy field to carry over?** Add it to the legacy `SELECT` (cast
  timestamps with `::text`), the interface, and the target `INSERT`.
- **Verifying a change:** the fastest loop is the local one described in the
  README's "Testing locally" section — restore a legacy dump, run against a
  scratch target DB, run twice, and confirm the report is identical (the
  second run proves idempotency).

## After cutover

1. Remove the `LEGACY_*` env vars from Coolify.
2. Delete `tools/migrate/` (and this file's operational relevance ends; keep
   `src/lib/server/password.ts` — see Passwords above).
3. The final legacy dump is the long-term archive for everything that wasn't
   migrated.
