# Legacy → FPA Events migration bundle

This temporary, standalone package contains the whole legacy migration: one
command, helpers, offline tests, an opt-in browser smoke suite and this runbook.
Delete `tools/migrate` after go-live. Nothing in the app imports this bundle.

## One command

From `tools/migrate`, with dependencies already prepared **before** supplying
credentials:

```sh
npm run migrate:all -- --dry-run
npm run migrate:all
```

The command reads the legacy database and bucket only. It:

1. Geocodes location strings absent from `data/event-locations.json` through
   Photon. Existing entries, including explicit `null`, stay intact. It prints
   full new mappings, saves the file, then requires an explicit `yes` to import
   them. Any other answer stops before deletion and leaves the file for review.
2. Displays the target DB host, connected database name and R2 bucket, then
   requires that **exact database name typed at the terminal**. There is no
   confirmation environment variable or flag. Local, staging and production
   targets are allowed. A wrong answer stops before deletion. Identical source
   and target database URLs (host/port/name), or bucket names, are refused.
3. Checks source picture existence/types, starts a DB transaction, wipes the
   target tables and imports all legacy rows, preserving IDs and bcrypt hashes.
4. Performs **DB-only verification first**: actual stored counts, location
   references and browser-resolvable picture URLs. Failure rolls back the DB
   and leaves every target bucket object untouched.
5. Only after those checks pass, deletes **every object** in the target R2
   bucket, across all prefixes and listing pages, then copies legacy pictures.
6. Verifies the target picture objects, then commits the DB transaction.

The exact write order is **DB import → DB-only verification → R2 wipe → R2 copy
→ target-picture verification → COMMIT**. Every failure exits nonzero. DB
changes roll back on failure, but **R2 has no transaction**: a copy, final-picture
check or COMMIT failure after the wipe can leave the **old DB with a changed,
empty or partially replaced bucket**. Before a real run the operator **must take
a target bucket listing and backup** using the commands below. Keep target
traffic stopped until verification and smoke checks succeed, or restore the
bucket backup to match the rolled-back DB before resuming traffic.

`--dry-run` asks **no questions**, including the geocode review prompt. It saves
new mappings, executes the DB wipe/import/verification in a transaction and
**rolls everything back**. It lists each R2 deletion/copy it would perform and
HEAD-checks source picture types/existence, with **no R2 deletes or uploads**.
The report labels these as planned source checks, not verified target copies.
Postgres serial sequences can advance despite rollback. Review mappings and
report before the real run; a dry run does not approve mappings for a later run.

The old `geocode`, `migrate`, and `migrate:pictures` scripts are now importable
internals, not executable commands. Only `migrate:all` opens connections.

### Verification and preserved safeguards

The report prints **legacy / expected / actual target** counts for `user`,
`account`, `events`, `event_user`, `event_magic_links`, `schedules`,
`event_locations` and `schedule_locations`. It fails on any actual/expected
mismatch. Expected counts account for the existing import rules:

- One credential account per non-empty legacy password hash; passwordless users
  remain users but need password reset. Imported established users are verified.
- One RSVP per `(event_id, user_id)`; duplicate legacy rows are collapsed, with
  organizing taking precedence as before.
- Map locations deduplicated by mapped `(city, country)`, only for referenced
  mappings; unresolved `null` entries remain unmapped. Venues deduplicated per
  event/name/coordinates; name-only venues are preserved.

Location tuples use unambiguous serialized arrays in the importer; the verifier
compares the source fields independently, so delimiter characters cannot merge
cities, countries or venue names with coordinates.

Every event picture URL must resolve in a browser to its original object key,
and every referenced
object must exist with an exact allowed content type: `image/jpeg`, `image/png`,
`image/webp`, `image/gif`, `image/avif`. Missing types, SVG/HTML, mixed case and
parameters (e.g. `image/jpeg; charset=binary`) are rejected. The copy helper also
rejects unsafe objects already in the target. Blank picture keys (including
JS whitespace) remain `NULL`. Each nonblank key's path segments are URL-encoded:
`#`, `?`, literal percent escapes, Unicode, whitespace and backslashes remain
part of the object key. The independent verifier parses the stored URL and
decodes the browser request pathname once; it never calls the importer's URL
builder. Keys with standalone `.` or `..` segments are rejected before the
bucket wipe, since browsers normalize even percent-encoded dot segments and
cannot request those keys faithfully. Rename those source keys and update the
legacy picture references before retrying. Email
addresses are trimmed/lowercased and collisions abort; malformed/non-ASCII ULIDs
abort. Events and schedules may not reference missing location rows.

Sessions and reset tokens are wiped, not migrated. Cache/jobs, Pulse telemetry
and the old unfinished competition feature are archived in the legacy dump.
The target already needs the current app schema; this tool does not apply it.
Stop writes to the target app during rehearsal/cutover to prevent concurrent
edits interfering with verification or the bucket wipe.

## Credential-free image preparation

Build on the VPS or a staging machine with the same architecture, from the
reviewed checkout, **before creating any credential file**:

```sh
# Repository root; no build args, secret mounts or credential files.
docker build --pull -f tools/migrate/Dockerfile -t fpa-migrate:reviewed tools/migrate
```

The Docker context is an allowlist: no `.env`, `.npmrc`, host `node_modules`,
smoke credentials or browser artifacts. Node 24 runs `verify-preparation.mjs`
before resolution, then `npm ci --ignore-scripts`, then only esbuild's required
install lifecycle. The Linux image does not need macOS-only fsevents. A build
step exercises real tsx and the native esbuild binary without service access.
No dependency installation happens at runtime. Do not replace locked preparation
with `npm install` in a credential-bearing app/migration container.

Preparation boundary checks (no real credentials, from the repository root):

```sh
DATABASE_URL=canary LEGACY_DATABASE_URL=canary R2_SECRET_ACCESS_KEY=canary \
  docker build --no-cache -f tools/migrate/Dockerfile -t fpa-migrate:reviewed tools/migrate
```

The host canaries must not reach the build environment. Offline unit tests also
exercise `verify-preparation.mjs` with mismatched/missing locks and credential
canaries; it must fail before install. To rehearse Docker's mismatch boundary,
copy the allowlisted inputs to a scratch directory, change a dependency range
in that copy's manifest only, then build it with `--network=none`. Expect
`Manifest/lock mismatch` before any registry resolution.

## Required target bucket listing and backup before a real run

Prepare AWS CLI v2 separately, before credentials. These are **operator commands**,
not commands the migration executes automatically. Keep target writes stopped
through backup, migration and any restoration. Use a dedicated backup credential
profile with access to the target and a **new, empty backup bucket in the same
R2 account**, separate from both legacy and target. The migration's narrower
runtime credential need not access the backup. Set the placeholders privately;
no credential values go on the command line:

```sh
umask 077
migration_r2_endpoint="https://${TARGET_R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
migration_backup_bucket='<new-empty-backup-bucket>'
migration_backup_listing='<private-path-outside-checkout>/target-before-migration.json'
# Verify the backup bucket is different from BOTH source and target first.
test "$migration_backup_bucket" != "$TARGET_R2_BUCKET_NAME" && \
  test "$migration_backup_bucket" != "$LEGACY_R2_BUCKET_NAME" || exit 1

# AWS CLI paginates the listing; retain it with the cutover artifacts.
aws --profile fpa-migration-backup --endpoint-url "$migration_r2_endpoint" \
  s3api list-objects-v2 --bucket "$TARGET_R2_BUCKET_NAME" --output json \
  > "$migration_backup_listing"
# Server-side bucket backup; copy object metadata, including Content-Type.
aws --profile fpa-migration-backup --endpoint-url "$migration_r2_endpoint" \
  s3 sync "s3://$TARGET_R2_BUCKET_NAME" "s3://$migration_backup_bucket" --copy-props metadata-directive
```

The [AWS CLI metadata-directive copy mode](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html)
preserves Content-Type and the other object metadata without the tagging API
calls made by the default mode; [R2 does not support object tagging APIs](https://developers.cloudflare.com/r2/api/s3/api/).

Require both commands to exit successfully and compare backup/target listings
(keys and sizes), including every listing page, before starting the real
migration. Confirm Content-Type metadata on representative copies. Retain the
backup and its listing until the migrated app has passed smoke checks; an
object listing alone is **not a backup**. Keep the backup bucket outside every
migration target configuration.

If a run fails **after the R2 wipe**, first confirm whether the target DB rolled
back (a lost connection during COMMIT can make its outcome uncertain). With the
app still stopped and the DB confirmed to be the pre-migration version, restore
the saved bucket snapshot, removing new objects introduced by the failed run:

```sh
# Destructive recovery: inspect the two bucket names before running.
aws --profile fpa-migration-backup --endpoint-url "$migration_r2_endpoint" \
  s3 rm "s3://$TARGET_R2_BUCKET_NAME" --recursive
aws --profile fpa-migration-backup --endpoint-url "$migration_r2_endpoint" \
  s3 sync "s3://$migration_backup_bucket" "s3://$TARGET_R2_BUCKET_NAME" --copy-props metadata-directive
```

Check the restored listing against the saved listing and verify copied metadata
before resuming the old app state. If DB commit succeeded, keep traffic stopped
and resolve the matching DB/bucket state rather than restoring only one side.
Do not run a second migration or remove the backup until recovery is settled.

## Run the prepared image

On the VPS, find the app's Docker network without displaying its environment:

```sh
docker inspect --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' <event-app-container>
```

Only after the image is prepared, use `umask 077` and create a temporary runtime
env file outside the checkout/build context. Fill in `.env.example`'s explicit
`LEGACY_*` and `TARGET_*` names using Coolify internal database URLs. Use a
read-only legacy DB user/bucket key and target credentials restricted to the
target database/bucket. Do not add these secrets to the app or use CLI literals
or build args. Keep source and target databases/buckets separate, even if DNS
aliases could make their URLs look different.

Bind-mount the **reviewed checkout's mapping directory** read-write so new
geocodes survive `--rm`, including when review is declined. The image runs as
`node` (UID 1000); grant that user access to the mapping directory on the host.
The mapping contains locations, not credentials. Review and commit mapping
changes in the checkout before the final run. Complete the required bucket
listing/backup above before removing `--dry-run`. `-it` is required for real runs:

```sh
umask 077
migration_env=$(mktemp /tmp/fpa-migration.XXXXXX)
# Edit "$migration_env" with the runtime credentials; do not print it.
# Ensure the file is removed even if a run fails.
trap 'rm -f "$migration_env"' EXIT

# From the repository root; replace the network name.
docker run --rm -it --network <event-app-network> \
  --env-file "$migration_env" \
  --mount type=bind,src="$PWD/tools/migrate/data",dst=/migration/data \
  fpa-migrate:reviewed src/migrate-all.ts --dry-run
# Review report and mapping file. Then the same command, without --dry-run:
docker run --rm -it --network <event-app-network> \
  --env-file "$migration_env" \
  --mount type=bind,src="$PWD/tools/migrate/data",dst=/migration/data \
  fpa-migrate:reviewed src/migrate-all.ts
```

Keep the terminal attached. A real run without a terminal fails closed, and
EOF/cancel does not authorize anything. Remove the runtime file and expire its
credentials after use. The DB ports are firewalled: use container networking,
not dependency installation inside the app, if a hostname is unreachable.

## End-to-end rehearsal from a local legacy dump

1. Export a fresh legacy dump on the VPS (`pg_dump -Fc`), transfer it securely,
   and restore into a separate local database:

   ```sh
   createdb -U postgres fpa_legacy_rehearsal
   pg_restore -U postgres -d fpa_legacy_rehearsal --no-owner --no-privileges fpa-legacy.dump
   createdb -U postgres fpa_migrated_rehearsal
   # Repository root: apply the app schema to the disposable target only.
   DATABASE_URL=postgres://postgres@localhost:5432/fpa_migrated_rehearsal npx drizzle-kit migrate
   ```

2. Prepare the credential-free image above. Create the runtime env file only
   afterward. Set the source/target DB URLs to the two local DBs and point R2 at
   the legacy read-only bucket and a **dedicated disposable target bucket**
   with a working public URL. That target bucket will be completely deleted.
   On Docker Desktop use `host.docker.internal` in DB URLs; Linux may need
   `--add-host=host.docker.internal:host-gateway` on `docker run`.
3. Run `src/migrate-all.ts --dry-run` in the prepared image using the same
   mapping bind mount. Inspect every warning/count, fix collisions/invalid IDs,
   missing/unsafe pictures and unresolved maps in the source/mapping as needed.
   Review new Photon mappings by hand; `null` is allowed for unresolved strings.
4. Take the target bucket listing/backup above, then run `src/migrate-all.ts` interactively. Approve any new mappings and type
   `fpa_migrated_rehearsal` at the deletion prompt. Require a successful final
   verification report. Repeating it fully replaces the disposable target.
5. Start the app against the migrated DB and target bucket/public URL (use a
   local env file outside this bundle for the app's other required settings).
   For local smoke use Turnstile's documented testing configuration/dev fallback;
   a live CAPTCHA cannot be solved by this suite.
6. Run the opt-in smoke below with a known legacy bcrypt user and representative
   IDs from the restored dump. Fix any failure before the real cutover.

At final cutover put Laravel into maintenance mode **before the final dump**
(decision `01M57G914YAPXEZJNSRR2EHF2Y`), rehearse the same single command against
that dump, run smoke against the deployed target, then switch the domain.
Remove temporary secrets, archive the dump and remove this folder after go-live.

## Offline tests and type check

No service credentials are needed or used. From `tools/migrate`:

```sh
npm test
npm run check
```

The bundle has its own Vitest config (Node environment) and script; in this
checkout it resolves the already installed repository Vitest/Playwright tools
from the parent `node_modules`. No new dependencies or lock changes are needed.
Its own `tsc`, tsx, pg and AWS SDK are installed under this package. These test
runners are development tooling only and are not required in the migration
Docker image. The app's `npx vp test run` includes only `src/**/*.test.ts` and
never this bundle; its type check also excludes `tools`.

Offline tests run real import loops, guards, bucket commands and verification
against in-memory adapters, with no real database, Photon or bucket. They cover
prompt refusal, geocode persistence, dry-run rollback/no R2 writes, full paginated
wipe, email collisions, ASCII IDs, blank keys, allowed/rejected content types,
actual stored row-count mismatches before bucket deletion, delimiter-collision
fixtures, browser-resolved picture URLs, dangling locations and failure exit
status through the actual `src/migrate-all.ts` executable (with only services,
TTY state and prompts mocked).

## Opt-in migrated-app smoke

This suite is **not** in the app's integration run. It starts no app server,
seeds no rows, imports no app helpers and opens no SQL/bucket connections.
Use it only against an explicitly selected migrated app with an account known
to have a legacy bcrypt hash. It signs in, so it creates a normal session, and
visiting Attending may mint the user's normal calendar token. It reads existing
RSVPs rather than changing them; no account/event deletion or token rotation.

Prepare the existing Playwright/Chromium tooling without credentials first.
Then supply these environment variables through a private runtime env mechanism
(do not commit them or put passwords in shell history):

| Variable                                             | Meaning                                                                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `MIGRATION_SMOKE`                                    | Exactly `1` to opt in; otherwise the spec is skipped                                                             |
| `MIGRATION_SMOKE_BASE_URL`                           | Full http(s) URL of the running migrated app                                                                     |
| `MIGRATION_SMOKE_EMAIL` / `MIGRATION_SMOKE_PASSWORD` | Known legacy bcrypt account's credentials                                                                        |
| `MIGRATION_SMOKE_PICTURE_EVENT_ID`                   | Migrated event with a published picture                                                                          |
| `MIGRATION_SMOKE_SCHEDULE_EVENT_ID`                  | Migrated event with a schedule                                                                                   |
| `MIGRATION_SMOKE_SCHEDULE_ITEM_NAME`                 | Exact known item text to find in that schedule                                                                   |
| `MIGRATION_SMOKE_RSVP_EVENT_ID`                      | Event this user already **attends**, including a past event; organizing alone does not enter their calendar feed |
| `MIGRATION_SMOKE_MAP_EVENT_ID`                       | An **upcoming** migrated event with a resolved map location                                                      |

```sh
# tools/migrate; env supplied privately. No automatic dotenv loading.
npm run test:smoke
```

The spec uses existing app test IDs (`calendar-feed-url`, `rsvp-sign-in-link`),
unambiguous labels/roles, and Leaflet's own marker/popup selectors. It waits for
hydration after every navigation and for network idle after interactions.
Pictures must actually load, the selected schedule item and existing RSVP must
appear, a popup must link to the selected map event, and the calendar response
must contain that RSVP's UID. Browser errors fail the run (external OSM tiles
are best-effort). Traces, screenshots and video are off to avoid recording
credentials/private calendar URLs. Live CAPTCHA/rate limits/network availability
remain operator responsibilities.
