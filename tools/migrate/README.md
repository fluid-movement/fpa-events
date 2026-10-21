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

Picture content types are matched **exactly** against `image/jpeg`, `image/png`,
`image/webp`, `image/gif` and `image/avif`: lowercase only, with no parameters
(for example, `image/jpeg; charset=binary` is rejected). This applies both to
legacy objects before copying and to objects already present in the target.
Every rejected key and its type are listed in the summary, including unsafe
target objects. Any rejected/unsafe or missing object makes the run **exit 1**;
existing unsafe target objects are reported for owner repair, never silently
accepted or automatically deleted. Blank picture keys (including tabs/newlines)
are skipped consistently by the DB and picture steps.

## Prepare dependencies before supplying credentials

Build a separate migration image from the reviewed checkout, on the VPS host
over SSH or a staging machine with the same architecture. Do this **before**
creating any credential file. Do not install dependencies in the deployed app's
container: it already has database and bucket secrets.

```sh
# From the repository root. No --build-arg, secret mounts or credential files.
docker build --pull -f tools/migrate/Dockerfile -t fpa-migrate:reviewed tools/migrate
```

The Docker context allowlist excludes `.env`, `.npmrc` and host `node_modules`.
The image uses Node 24, checks the manifest against the lock before any registry
resolution, installs it with `npm ci --ignore-scripts` (a missing or mismatched
lock fails), then explicitly runs only esbuild's required
install lifecycle. The other install-script package in this lock, `fsevents`, is
macOS-only and unnecessary in this Linux image. Review those scripts again when
changing the lock. A build step exercises real tsx TypeScript loading and the
esbuild binary without opening a database or bucket connection. Do not replace
this with an unresolved `npm install` or leave esbuild unprepared.

### Check the preparation boundary without real credentials

These repeatable checks never execute a migration. From the repository root:

```sh
# Harmless canaries exist on the host; the build assertion proves none reaches
# the dependency-install environment. --no-cache forces the assertion to run.
DATABASE_URL=canary LEGACY_DATABASE_URL=canary R2_SECRET_ACCESS_KEY=canary \
  docker build --no-cache -f tools/migrate/Dockerfile -t fpa-migrate:reviewed tools/migrate

# Break only a scratch copy of the manifest; the committed lock stays intact.
mkdir -p .svelte-kit
fixture=$(mktemp -d "$PWD/.svelte-kit/migration-lock-check.XXXXXX")
cp tools/migrate/Dockerfile tools/migrate/.dockerignore tools/migrate/package.json tools/migrate/package-lock.json tools/migrate/verify-preparation.mjs "$fixture/"
cp -R tools/migrate/src tools/migrate/data "$fixture/"
node --input-type=module -e '
  import fs from "node:fs";
  const file = process.argv[1];
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  pkg.dependencies.pg = "0.0.0-lock-mismatch";
  fs.writeFileSync(file, JSON.stringify(pkg));
' "$fixture/package.json"
if docker build --network=none -t fpa-migrate:lock-mismatch "$fixture"; then
  rm -rf "$fixture"
  echo 'ERROR: mismatched manifest was accepted' >&2
  exit 1
fi
# Confirm the build failed with "Manifest/lock mismatch", rather than a
# Docker/network error. It must not reach npm ci, npm rebuild or the runtime.
rm -rf "$fixture"
```

## Running on the server (the real thing)

The DB ports are firewalled; only containers on the VPS can reach the databases.
Run the **already prepared** image on the event app's Docker network. On the VPS,
find that network without displaying the app's environment:

```sh
docker inspect --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' <event-app-container>
```

Only after preparation, create a temporary env file **on the VPS host**, outside
the checkout/build context. For example, run `umask 077`, then
`migration_env=$(mktemp /tmp/fpa-migration.XXXXXX)` and edit that file. Use the
names in `.env.example`, including explicit `TARGET_DATABASE_URL` and
`TARGET_R2_*` values rather than inheriting the app's environment. Use the
databases' Coolify **internal** URLs. Supply a read-only legacy DB credential
and bucket-read credential, and target credentials limited to the migration's
database/tables and target bucket. The DB step needs `TARGET_R2_PUBLIC_URL` but
no bucket credentials; supply bucket keys only for the picture step. Do not add
`LEGACY_*` to the event app or pass credentials as build args or CLI literals.

```sh
# Replace <event-app-network> with the network found above.
docker run --rm --network <event-app-network> --env-file "$migration_env" fpa-migrate:reviewed src/migrate.ts --dry-run
# Review the report before continuing.
docker run --rm --network <event-app-network> --env-file "$migration_env" fpa-migrate:reviewed src/migrate.ts
# Edit the temporary file for the picture step's credentials first.
docker run --rm --network <event-app-network> --env-file "$migration_env" fpa-migrate:reviewed src/pictures.ts
rm -f "$migration_env"
```

No dependency installation occurs during these credential-bearing runs. Remove
the temporary file even if a command fails, and expire the temporary credentials
when done. Existing read-only credential work is tracked in
`01M5A4X9DHFRA3HK0KQB1DY1CF`; post-cutover cleanup belongs to
`01M4B48HQM4538H4JMG7942N2Y`. Coolify app build/runtime secret scoping remains
with `01M5A34Z75BVD5BE4AZWWEDCPA`.

The new app isn't live yet, so its production DB is also the test target:
migrate into it, browse the deployed app, re-run whenever the schema or the
tool changes. The legacy side is only ever read, so pointing at the old app's
live DB is safe — and at cutover it means zero data lag.

If the old DB's hostname doesn't resolve, join its Docker network or restore a
legacy dump as a second database inside the new app's Postgres and point
`LEGACY_DATABASE_URL` there. Reuse the prepared image; never install in the
credential-bearing app container as a fallback.

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
2. Cutover: run the prepared image as above — DB dry run, review the report,
   DB migration, then picture migration (stragglers).
3. Switch the domain to the new app in Coolify.
4. Clean up: remove temporary credential files and credentials; delete
   `tools/migrate/` from the repo when you're confident (existing cleanup issue).

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
DATABASE_URL=postgres://postgres@localhost:5432/fpa_migrated npx drizzle-kit migrate

# Prepare the locked image BEFORE configuring any credentials (see above).
# Use host.docker.internal instead of localhost in the DB URLs on Docker Desktop;
# on Linux add --add-host=host.docker.internal:host-gateway to docker run.
# For the existing local tsx commands, use a separate credential-free staging
# checkout: node verify-preparation.mjs, npm ci --ignore-scripts, then
# npm rebuild esbuild. Only afterwards
# copy .env.example to .env and fill in both sides; never install with .env present.
# Run geocode in that local checkout and review/commit its mapping as above.
# Execute the prepared image with a temporary --env-file for the DB/picture steps.

# Browse the result:
DATABASE_URL=postgres://postgres@localhost:5432/fpa_migrated npm run dev
```

Best local checks: log in with your own legacy email + password (exercises the
bcrypt path), events list + pictures, the events map, and schedules with and
without venue coordinates.
