# FPA Events

## Boundary

Do not make changes I didn't explicitly ask for. Only act on clear instructions.

# FPA Events

## Git Workflow

**Mode: direct-to-main**

This is a private repository without branch protection enabled. Commits go directly to `main` — no feature branches or PRs required.

**I decide when to push** — do not push unless I explicitly ask you to. Commit after each meaningful unit of work using the `/commit` skill, but don't push.

## Code Style

**Always use remote functions for server interactions** — never traditional form actions or `+page.server.ts` `actions`. Use `form()` and `query()` from `$app/server` in `data.remote.ts` files colocated with the route. The project has `remoteFunctions: true` enabled in `svelte.config.js`.

**Always use modern Svelte 5 runes** — `$state`, `$derived`, `$derived.by`, `$effect`, `$props`. Never legacy reactive syntax (`$:`, `let` stores, etc.).

**No `use:enhance`** — remote functions handle progressive enhancement automatically via `{...formAction}` spread on `<form>` elements.

**Reach for the shared helpers before writing a new one.** The cleanup pass that
introduced these found the same code in three to five places each time; adding a
sixth copy is the thing to avoid.

- **Auth guards** — `$lib/server/authz`: `requireSignedIn(locals)` in a `load`,
  `requireSignedInRequest()` in a remote function (302 vs 307 is deliberate),
  `requireEventManager(id)` / `requireEventOwner(id)` for event permissions.
- **Event queries** — `$lib/server/utils/events`: `listEventsWithAttendeeCount`,
  `withUserStatus`, `attendingEvents`, `organizingEvents`, `eventUserCounts`.
  Never count attendees one event at a time.
- **Dates** — `$lib/utils/dates` owns every format the app renders. Add a named
  function there rather than a local `toLocaleDateString` in a component.
- **HTML** — `$lib/utils/html`: `sanitizeRichText` on the way in,
  `escapeHtml` for the one place that builds markup by hand (Leaflet popups),
  `stripHtml` for excerpts.
- **Destructive actions** — `<ConfirmSubmit>` (`$lib/components/layout`) pairs a
  confirmation dialog with a hidden remote form. Don't hand-roll the
  `requestSubmit()` dance.
- **Signed-out pages** — `<AuthCard>` + `<AuthForm>`.
- **Leaflet** — `$lib/leaflet`: `loadLeaflet()`, `addOsmTiles()`,
  `enableTwoFingerPan()`. Never import `leaflet` statically; it touches `window`.

**Prefer `untrack` to an `$effect` when seeding state from a prop.** Mirroring
props into `$state` with an effect is the pattern Svelte warns about. If the
component is rebuilt whenever the prop changes — which is the usual case here —
seed it once with `untrack(() => prop)` and say so in a comment. Reserve the
effect for state that genuinely has to resync, such as the optimistic RSVP count
on `events/[id]`.

**Plain `Map`/`Date`, not `SvelteMap`/`SvelteDate`, for local computation.** The
reactive variants only earn their keep when something mutates them after they're
built and the UI must follow.

**Submit feedback uses `formAction.pending > 0`** — remote-function-backed forms disable their submit button and swap its label (e.g. "Save changes" → "Saving…") by reading `.pending` off the `form()` result. Forms with no remote function behind them (the auth pages calling `better-auth` client methods directly) use a local `loading` `$state` boolean for the same disable/label-swap instead — both are legitimate; pick whichever's available and never invent a third pattern.

## Testing

**Test what can break, not what can render.** There is no test-per-component rule — a test needs a reason to exist, and "this component is new" is not one. Tests that only prove a component renders the props it was handed cost maintenance and catch nothing.

Write a test when one of these applies:

- **Logic that can be wrong**: pure functions, formatting, grouping, filtering, ranking and points math.
- **Rules that must hold**: authorization, ownership, privacy visibility, email verification, password hashing and legacy migration.
- **Hand-written interaction logic**: keyboard navigation, upload success/failure handling, dismissal that persists.
- **Destructive or hard-to-undo flows**: deleting an event, magic-link invites, role changes.
- **A bug we actually hit** — the regression is the reason.

Do not write a test for:

- shadcn/bits-ui wrappers in `src/lib/components/ui/` — they are vendored primitives, not our logic.
- Presentational components that just display what they are given.
- Styling, layout, animation, or anything else cosmetic.
- "Renders without throwing" / "renders the name it was passed" smoke tests.
- Behaviour already covered a level down — don't re-test date formatting through a card that calls the formatter.

Kinds:

- **Unit tests** (Vitest): pure functions, server helpers, and components with real interaction logic of our own. Lives in `src/**/*.test.ts` alongside the code it tests.
- **Integration tests** (Playwright): user-visible behavior across the stack — form submissions, page navigation, DB state. Lives in `tests/integration/`. These cost a browser and seconds each, so keep them for flows that matter, not for dev-only tooling.

**Test selectors**: use `data-testid` attributes on interactive elements that tests need to target, especially where role-based selectors would be ambiguous (e.g., sidebar nav vs. page content).

**After remote function calls**: always `await page.waitForLoadState('networkidle')` before asserting UI state, to let the fetch and page data revalidation complete.

**Wait for hydration before the first click too.** Anything driven by an `onclick`, a remote `form()`, or a bits-ui primitive does nothing until the page hydrates — a click sent too early is silently dropped and surfaces later as a flake. `await page.waitForLoadState('networkidle')` after `page.goto()`, not just after submitting.

**Assert database state with `expect.poll`, not a bare read.** A remote call returns before the row is visible to the test's own Postgres connection, so `expect(await getScheduleCount(id)).toBe(1)` races. Use `await expect.poll(() => getScheduleCount(id)).toBe(1)`.

**Deliberate error responses**: a test that drives a request to a 4xx makes the browser log a failed resource, which trips the error guard. Call `expectConsoleErrors(page)` from `tests/integration/helpers/console.ts` in that test rather than widening the guard's `IGNORED` list, which would blind every other test to the same status.

**Destructive identity tests** must not use the shared `storageState` user — deleting it breaks the rest of the run. Use `signUpAndSignIn()` from `tests/integration/helpers/auth.ts` to get a throwaway account.

## Quality gates

Git hooks are the only thing between a commit and a Coolify production deploy — there is no CI. They are bypassable with `--no-verify`, so treat that as a deliberate act.

- **pre-commit** (~20s): `lint-staged` (Prettier + ESLint on staged files only), then `npm run check`, then `npm run test`. Note `npm run lint` is deliberately _not_ used — it runs `prettier --check .` over the whole repo and would fail on files the commit never touched.
- **pre-push** (~2-4 min): `npm run build`, then `npm run db:migrate:test`, then `npm run test:integration`. The build runs first because a build failure is the likeliest cause of a broken deploy and it fails fastest.

**The deploy runs an older Node than your machine.** Coolify builds with
nixpacks at `NIXPACKS_NODE_VERSION=22`, which pins only the major and currently
resolves to **Node 22.19.0 / npm 10.9.3** — behind the 22.22.x most dev machines
are on. A dependency whose `engines.node` floor lands between the two will still
install (npm just warns), but it will not _run_ in the container.

This is why `.npmrc` no longer sets `engine-strict=true`: with it on, that
warning became a fatal `EBADENGINE` and aborted `npm install`, which is what
broke the 2026-09-15 deploy when `lint-staged` raised its floor to `>=22.22.1`.
lint-staged and husky are git-hook tooling that never executes in the container,
so failing the build on their Node floor bought nothing.

To check the whole tree against the build's Node before pushing something
dependency-shaped:

```
node -e "const s=require('semver'),l=require('./package-lock.json');
for(const[p,v]of Object.entries(l.packages))
  if(v.engines?.node&&!s.satisfies('22.19.0',v.engines.node))
    console.log(p,v.version,v.engines.node)"
```

Pin `NIXPACKS_NODE_VERSION` to an exact version (or to `24`) in Coolify if you
want the build on a current Node — after that, `engine-strict` could safely come
back.

**Integration tests use their own database.** One-time setup:

```
createdb fpa_events_test && npm run db:reset:test
```

`.env.test` is committed and holds no secrets; machine-specific overrides go in `.env.test.local`, which stays gitignored. Playwright serves the app on **port 5174** via `npm run dev:test` so it can never attach to a dev server on 5173 that is wired to the dev database. `tests/integration/helpers/db.ts` refuses to run against a database whose name does not contain `test`.

Mailgun, Turnstile and R2 keys are blank in `.env.test` on purpose, which forces each service's dev fallback — in particular, tests sign up users at `@playwright.local`, and a live Mailgun key would attempt real delivery to a domain that does not exist.

**Unauthenticated tests**: use `context.clearCookies()` on the existing Playwright context rather than `browser.newContext()`.

**Identity sequences**: if seeding the DB with explicit IDs, reset the sequence afterward — otherwise inserts will fail with duplicate key errors.

## Seed Script

**Keep `src/lib/server/db/seed.ts` in sync with the schema and features** — any change to the database schema or data model must be reflected in the seed script. This includes:

- New tables: add seed data and include the table in the teardown block (FK-safe order)
- New columns: populate them in the relevant seed rows
- New statuses or enum values: cover them in seed RSVPs / event_user rows
- Changed relationships: update the seed to wire up the FK correctly
