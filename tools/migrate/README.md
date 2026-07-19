# Legacy → fpa-events data migration

Standalone one-off tool that migrates data from the old Laravel FPA app into
this app's database and R2 bucket. It is a separate application in everything
but location: own `package.json`, no imports from the app, configured purely
via env vars. It lives in this repo so schema changes and migration changes
ship together; delete the whole folder after the final cutover.

**What migrates:** users (incl. bcrypt password hashes — the app verifies them
via `src/lib/server/password.ts`), events, RSVPs (`event_user`), magic links,
schedules (+ venue locations), event map locations (via the geocode mapping
file), and event pictures.

**What doesn't:** sessions, password reset tokens, cache/jobs, Pulse telemetry,
and the unfinished competition feature (divisions, rounds, teams, pools,
players, results, active_years). A dump of the old DB is the archive for those.

The three steps, all idempotent (re-run any time):

```sh
npm run geocode            # 1. refresh data/event-locations.json (only new strings hit Photon)
npm run migrate -- --dry-run   # 2a. full run in a transaction, rolled back; prints the report
npm run migrate            # 2b. wipe-and-reload of the target DB, IDs preserved 1:1
npm run migrate:pictures   # 3. copy R2 objects (skips objects already in the target bucket)
```

`migrate` **deletes all rows** in the target tables it owns (users, events,
RSVPs, schedules, sessions, accounts…) before reloading them from the legacy
DB, so every run converges to the state of the legacy source. Never point
`TARGET_DATABASE_URL`/`DATABASE_URL` at a database whose data you want to keep.

## Running on the server (the real thing)

The DB ports are firewalled; only containers on the VPS can reach the
databases. The tool runs **inside the deployed event app's container**, which
already has Node, this repo's checkout, and the target-side env vars
(`DATABASE_URL`, `R2_*`) — the tool falls back to those names automatically.

One-time setup in Coolify — add the legacy-side env vars to the **event app**:

- `LEGACY_DATABASE_URL` — the old app's Postgres **internal** URL (shown on
  the database's Coolify page as "Postgres URL (internal)")
- `LEGACY_R2_ACCOUNT_ID`, `LEGACY_R2_ACCESS_KEY_ID`,
  `LEGACY_R2_SECRET_ACCESS_KEY`, `LEGACY_R2_BUCKET_NAME` — the old bucket

Then open the app's **Terminal** in Coolify and run:

```sh
ls tools/migrate           # sanity check that the image ships the tool
cd tools/migrate
npm install                # ephemeral — repeat after every redeploy
npm run migrate -- --dry-run
npm run migrate
npm run migrate:pictures
```

The new app isn't live yet, so its production DB is also the test target:
migrate into it, browse the deployed app, re-run whenever the schema or the
tool changes. The legacy side is only ever read, so pointing at the old app's
live DB is safe — and at cutover it means zero data lag.

If `tools/migrate` is missing from the image, or the old DB's hostname doesn't
resolve from the app container: either deploy this folder as its own
Dockerfile-based Coolify app, or restore a legacy dump as a second database
inside the new app's Postgres and point `LEGACY_DATABASE_URL` there.

### Geocoding

`npm run geocode` edits `data/event-locations.json`, which must be
**committed** — run it locally (see below), review/fix entries by hand (Photon
returns localized country names, and some strings won't resolve → `null`),
commit, redeploy. Don't run it in the container: filesystem changes are lost
on redeploy. In a pinch, run it there, print the file, and paste it into the
repo.

## Cutover runbook

1. Ahead of time: deploy the latest app, run `migrate:pictures` so the bulk of
   the R2 copy is already done, run `geocode` locally against a fresh dump and
   commit any new locations.
2. Cutover: in the app terminal — `npm run migrate -- --dry-run`, check the
   report, `npm run migrate`, `npm run migrate:pictures` (stragglers).
3. Switch the domain to the new app in Coolify.
4. Clean up: remove the `LEGACY_*` env vars; delete `tools/migrate/` from the
   repo when you're confident.

Sessions are not migrated — users log in again with their existing passwords
(bcrypt hashes are verified transparently by the app).

## Testing locally

Local runs can't reach the server databases, so use a restored dump:

```sh
# On the VPS: dump the old app's DB, then scp it down
docker exec <old-postgres-container> pg_dump -Fc -U <dbuser> <dbname> > fpa-legacy.dump

# Locally (needs pg client tools, e.g. `brew install libpq`):
createdb -U postgres fpa_legacy
pg_restore -U postgres -d fpa_legacy --no-owner --no-privileges fpa-legacy.dump

# Fresh target DB with the app schema:
createdb -U postgres fpa_migrated
cd .. && DATABASE_URL=postgres://postgres@localhost:5432/fpa_migrated npx drizzle-kit migrate

# Configure and run:
cd tools/migrate && cp .env.example .env   # fill in both sides
npm install
npm run geocode && npm run migrate -- --dry-run && npm run migrate

# Browse the result:
cd ../.. && DATABASE_URL=postgres://postgres@localhost:5432/fpa_migrated npm run dev
```

Best local checks: log in with your own legacy email + password (exercises the
bcrypt path), events list + pictures, the events map, and schedules with and
without venue coordinates.
