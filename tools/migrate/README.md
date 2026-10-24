# Legacy → FPA Events migration bundle

This temporary, standalone package contains the whole legacy migration: one
command, helpers, offline tests, an opt-in browser smoke suite and this runbook.
Delete `tools/migrate` after go-live. Nothing in the app imports this bundle.
It runs from the event app's container through Coolify's terminal.

## One command

From `tools/migrate`, with dependencies already installed:

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
empty or partially replaced bucket**. Keep target traffic stopped until
verification and smoke checks succeed.

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
Stop writes to the target app during cutover to prevent concurrent
edits interfering with verification or the bucket wipe.

## Run from the event app's Coolify terminal

The bundle ships in the event app's image and runs inside its container, so it
reads the target from the app's own `DATABASE_URL` and `R2_*` settings. Only the
legacy side needs adding:

1. In Coolify, add `LEGACY_DATABASE_URL`, `LEGACY_R2_ACCOUNT_ID`,
   `LEGACY_R2_ACCESS_KEY_ID`, `LEGACY_R2_SECRET_ACCESS_KEY` and
   `LEGACY_R2_BUCKET_NAME` to the event app's environment. Use the old app's
   internal database URL and a read-only legacy DB user and bucket key. Let the
   app restart so the variables reach the container.
2. Open the app's Terminal in Coolify, then:

   ```sh
   cd tools/migrate && npm ci --include=dev
   npm run migrate:all -- --dry-run
   npm run migrate:all
   ```

   Review the dry-run report before the real run. The real run needs an
   interactive terminal; the owner confirms on the first dry run that Coolify's
   web terminal provides one. Answer the geocode review and type the target
   database name at the prompts as described above.

3. After cutover, remove the `LEGACY_*` variables from the app.

`npm ci --include=dev` is ephemeral: it lives in the container, so repeat it after
each redeploy. `--include=dev` is needed because `tsx`, the runner for
`migrate:all`, is a devDependency, and the app container may set
`NODE_ENV=production`, which makes a plain `npm ci` skip it. The geocode mapping written to `data/event-locations.json` in the
container is ephemeral too; it need not be kept or committed.

The target is the app itself, so stop writes to the app while the migration
runs. Once the migration has committed and smoke checks pass, the bucket
contents are the migrated data; there is no separate backup step, because the
target data is ephemeral.

## Offline tests and type check

No service credentials are needed or used. From `tools/migrate`:

```sh
npm test
npm run check
```

The bundle has its own Vitest config (Node environment) and script; in this
checkout it resolves the already installed repository Vitest/Playwright tools
from the parent `node_modules`. No new dependencies or lock changes are needed.
Its own `tsc`, tsx, pg and AWS SDK are installed under this package. The app's `npx vp test run` includes only `src/**/*.test.ts` and
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
