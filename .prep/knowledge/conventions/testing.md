---
type: convention
title: Testing
description: Vitest mocks and aliases, the Playwright test DB and server, and the anti-flake rules.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:44:51Z
scope:
  - vite.config.ts
  - playwright.config.ts
  - src/test
  - tests/integration
  - .env.test
status: stable
confirmed_commit: 4b88ef283667b3ff5e1dd21b9fa0cc7270a7ac21
---

# Testing

`AGENTS.md` sets the policy: test what can break, not what renders. This entry
covers the machinery.

## Unit (Vitest, `vp test run`)

- Files: `src/**/*.test.ts`, next to the code. jsdom environment, globals on,
  `src/test/setup.ts` loads jest-dom matchers.
- `vite.config.ts` aliases **exact** module ids to mocks in `src/test/mocks/`:
  `$app/paths`, `$app/state`, `$app/server`, `#lib/server/db`,
  `$app/env/private`, `$app/env/public`. They are regex aliases on purpose, because a bare
  string alias would also catch `#lib/server/db/schema`. A new `$app/*`
  import in tested code may need a new mock here.
- `resolve.conditions: ['browser']` so Svelte components mount in tests.

Remote-form fields are stubbed with `src/test/form-fields.ts`
(`stubFormFields`), which mimics Kit's `as()`/`value()`/`set()`/`dirty()`
semantics, seed suppression included.

## Integration (Playwright, `npm run test:integration`)

- Own database: `createdb fpa_events_test && npm run db:reset:test`.
  `.env.test` is committed with no secrets; `.env.test.local` overrides it.
  `tests/integration/helpers/db.ts` refuses any DB whose name lacks `test`.
- The app is served by `vp run dev:test` (plain `vite dev --mode test`) on
  port **5174**, never 5173.
  `BETTER_AUTH_URL` must match that port.
- `workers: 1`, serial. Specs share one DB and one seeded user.
  `auth.setup.ts` signs up `TEST_USER`, marks it verified by SQL and saves
  `playwright/.auth/user.json` as the shared `storageState`.
- `FPA_API_URL` points at the real read-only fpa-api. The rankings/results
  specs assert behaviour, not specific players, because the fetch happens
  server-side where `page.route()` cannot intercept it.
- Mailgun, Turnstile and R2 are blank so they fall back. Verification links are
  read from the console log.

## Testing a hostile request

To prove a remote function rejects tampered input (another event's id,
disallowed markup), post the real form with fields overridden:
`postOverriding(page, remote, holding, overrides)` in
`tests/integration/helpers/forms.ts`. It finds the form of the named remote
function that holds `holding` (an item's edit and delete forms both hold its
id, so naming the remote matters), builds its `FormData`, overrides fields by
key (Kit names them `<key>/<form id>`), and `fetch`es `form.action` with
`accept: text/html`. Without
that header Kit answers 405. **Editing the hidden inputs in the DOM and clicking
submit does not work**: Kit submits from its own field state, so such a test
passes against vulnerable code. Run every security test once against the
unfixed code and watch it fail **on an assertion about the data**, not on a
setup error. `svelte-check` does not type-check `tests/`, so a broken helper
signature only shows up at run time.

## Rules that prevent flakes

- `await page.waitForLoadState('networkidle')` after `goto` (hydration) and
  after every remote submit.
- Assert DB state with `expect.poll(...)`.
- `installErrorGuard(test)` (`helpers/console.ts`) fails a spec on any uncaught
  error or `console.error`. For a deliberate 4xx, call `expectConsoleErrors(page)`
  in that test instead of widening `IGNORED`.
- Destructive identity tests use `signUpAndSignIn()` (`helpers/auth.ts`), never
  the shared user. Signed-out tests call `context.clearCookies()`.
- Seeding explicit identity ids requires resetting the sequence afterwards.
