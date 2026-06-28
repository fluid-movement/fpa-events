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

## Testing

**Write tests as part of implementation** — every feature ships with tests, not after.

- **Unit tests** (Vitest): pure functions, utility logic, component rendering. Lives in `src/**/*.test.ts` alongside the code it tests.
- **Integration tests** (Playwright): user-visible behavior — form submissions, page navigation, DB state. Lives in `tests/integration/`.

**Test selectors**: use `data-testid` attributes on interactive elements that tests need to target, especially where role-based selectors would be ambiguous (e.g., sidebar nav vs. page content).

**After remote function calls**: always `await page.waitForLoadState('networkidle')` before asserting UI state, to let the fetch and page data revalidation complete.

**Unauthenticated tests**: use `context.clearCookies()` on the existing Playwright context rather than `browser.newContext()`.

**Identity sequences**: if seeding the DB with explicit IDs, reset the sequence afterward — otherwise inserts will fail with duplicate key errors.

## Seed Script

**Keep `src/lib/server/db/seed.ts` in sync with the schema and features** — any change to the database schema or data model must be reflected in the seed script. This includes:

- New tables: add seed data and include the table in the teardown block (FK-safe order)
- New columns: populate them in the relevant seed rows
- New statuses or enum values: cover them in seed RSVPs / event_user rows
- Changed relationships: update the seed to wire up the FK correctly
