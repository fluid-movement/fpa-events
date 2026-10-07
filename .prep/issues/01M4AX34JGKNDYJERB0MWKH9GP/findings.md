# Knowledge map

## The project

FPA Events is a SvelteKit 2 / Svelte 5 rebuild of the Freestyle Players
Association events site (events.freestyledisc.org, Laravel). Players browse,
RSVP to, create and co-organize events; rankings and competition results come
from the external fpa-api service. Postgres + Drizzle, Better Auth, Tailwind 4 +
vendored shadcn-svelte, Leaflet/Photon, Mailgun, R2, Turnstile. Deployed by
Coolify (nixpacks, Node 22.19) on every push to `main`; git hooks are the only
gate. `tools/migrate/` is a standalone one-off Laravel → Postgres migrator.

Sources read: README, AGENTS.md, TODO.md, docs/*, tools/migrate/README.md,
package.json, svelte/vite/playwright configs, .husky hooks, the schema, hooks,
authz, every remote function and server load under `src/routes`, and the
fpa-api client. `docs/context.md` and `docs/todo.md` are stale (form actions,
`/design` route, unbuilt membership phase); the README's `db:push` deploy step
and four linked docs files are stale or missing.

## Proposed entries, by area

Scope is the code an entry describes; a drift check compares against it.

### Area 1 — Platform and tooling

| Path                              | Type       | Title                               | Description                                                            | Scope                                                                       |
| --------------------------------- | ---------- | ----------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| /architecture/stack-and-layout.md | component  | Stack and source layout             | What lives where in `src/`, and which libraries do what                | `src/`, `svelte.config.js`, `vite.config.ts`                                |
| /conventions/remote-functions.md  | convention | Remote functions and shared helpers | `form()`/`query()` in `*.remote.ts`, `.pending`, shared helper modules | `src/routes/**/*.remote.ts`, `src/lib/api/`, `src/lib/server/utils/`        |
| /architecture/build-and-deploy.md | component  | Build, quality gates and deploy     | vp vs npm, husky gates, Coolify, migrations on deploy                  | `package.json`, `.husky/`, `.npmrc`, `drizzle.config.ts`                    |
| /conventions/testing.md           | convention | Testing                             | Vitest mocks/aliases, Playwright test DB, helpers, flake rules         | `vite.config.ts`, `playwright.config.ts`, `src/test/`, `tests/integration/` |
| /pitfalls/deploy-node-version.md  | pitfall    | Deploy Node is older than dev Node  | nixpacks resolves Node 22.19; engines floors above it break the build  | `.npmrc`, `package.json`                                                    |

### Area 2 — Data and identity

| Path                                    | Type       | Title                                       | Description                                                            | Scope                                                                                       |
| --------------------------------------- | ---------- | ------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| /components/database.md                 | component  | Database schema, migrations and seed        | Tables, relations, migration workflow, seed rules                      | `src/lib/server/db/`                                                                        |
| /components/auth.md                     | component  | Authentication                              | Better Auth config, legacy bcrypt, verification, Turnstile, auth pages | `src/lib/server/auth.ts`, `password.ts`, `turnstile.ts`, `src/hooks.server.ts`, auth routes |
| /conventions/authorization.md           | convention | Authorization                               | owner vs manager vs co-organizer vs admin; which guard where           | `src/lib/server/authz.ts`                                                                   |
| /pitfalls/better-auth-session-fields.md | pitfall    | Custom user columns are not on session.user | `role`, `showAttendance` must be read from the DB                      | `src/hooks.server.ts`, `src/routes/settings/privacy/`                                       |

### Area 3 — Events

| Path                                | Type      | Title                            | Description                                                    | Scope                                                                                              |
| ----------------------------------- | --------- | -------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| /features/events.md                 | feature   | Events                           | Browse, past archive, detail, create/edit/delete, image upload | `src/routes/events/`, `src/routes/+page*`, `src/lib/server/eventForm.ts`, `r2.ts`, upload endpoint |
| /features/rsvp-and-attendance.md    | feature   | RSVP, attendee lists and privacy | `event_user` statuses, the two attendee counts, opt-out        | `src/routes/events/[id]/`, `attending/`, `organizing/`, `dashboard/`, `settings/privacy/`          |
| /features/event-management.md       | feature   | Event management area            | Admin tabs: details, attendees, schedule + venues, invites     | `src/routes/events/[id]/admin/`, `src/routes/invite/`                                              |
| /features/calendar-feed.md          | feature   | Personal calendar feed           | Tokenised .ics of attending events                             | `src/routes/api/calendar/`, `src/lib/server/utils/calendar.ts`, `src/lib/api/calendar.remote.ts`   |
| /components/geolocation-and-maps.md | component | Geolocation and maps             | Photon geocoding, event/venue locations, Leaflet helpers       | `src/lib/geocoding.ts`, `src/lib/leaflet.ts`, map components, `eventLocations.ts`                  |
| /components/email.md                | component | Email                            | Mailgun, templates, console fallback, dev preview              | `src/lib/server/email.ts`, `src/lib/email/`, `src/routes/dev/`                                     |
| /pitfalls/rich-text-sanitizing.md   | pitfall   | Rich text is sanitized on read   | `{@html}` via RichContent needs sanitized input at every load  | `src/lib/utils/html.ts`, `src/lib/components/RichContent.svelte`                                   |

### Area 4 — Rankings and results

| Path                              | Type      | Title                         | Description                                  | Scope                                                                                                   |
| --------------------------------- | --------- | ----------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| /components/fpa-api.md            | component | fpa-api client                | Thin client, FpaApiError, in-memory indexes  | `src/lib/server/fpa-api/`                                                                               |
| /features/rankings-and-results.md | feature   | Rankings, results and players | Pages, remote queries, ApiResult degradation | `src/lib/api/`, `src/lib/rankings/`, `src/lib/results/`, rankings/results/players routes and components |

### Area 5 — Legacy migration

| Path                          | Type    | Title                          | Description                                            | Scope                                 |
| ----------------------------- | ------- | ------------------------------ | ------------------------------------------------------ | ------------------------------------- |
| /features/legacy-migration.md | feature | Laravel → fpa-events migration | geocode / migrate / pictures commands, wipe-and-reload | `tools/migrate/`, `docs/migration.md` |

## Bugs and gaps found during the survey

Filed as separate issues (see `prep list`):

- Stored XSS: schedule descriptions are rendered with `{@html}` unsanitized.
- Schedule edit/delete and venue delete are not scoped to the authorised event.
- The event `picture` field is client-controlled; replacing it deletes whatever R2 key it names.
- Invites lose the `?redirect=` after sign-in, so signed-out invitees never land back on the invite.
- `event_user` has no unique (event, user) constraint and `toggleRsvp` ignores organizers.
- No server-side check that an event ends after it starts.
- The README's deploy and docs links are stale.
- Missing pieces from TODO.md: source maps + `handleError` + error tracking, event hero layouts, date picker UX, event-detail map; and the two-ways attendee count needs a decision.
