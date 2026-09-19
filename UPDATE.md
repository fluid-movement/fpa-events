# SvelteKit 3 preview migration — findings and plan

Research done 2026-09-19 on branch `feature/sveltekit-2-update`. Nothing in this document has been
implemented; the working tree is unchanged apart from this file. Written to be picked up cold by a
session with no prior context.

---

## 1. The premise needs correcting first

The branch was opened to "migrate to SvelteKit 2", and `npx svelte-migrate sveltekit-2` was the
intended first step. **That is the wrong command for this repo.**

This project has been on SvelteKit 2 since it was created — `@sveltejs/kit` **2.70.1** is installed.
SvelteKit 2 shipped in December 2023 and is not in preview. Both the blog post
(`svelte.dev/blog/sveltekit-2`) and the guide (`svelte.dev/docs/kit/migrating-to-sveltekit-2`)
describe migrating **1 → 2**, and `svelte-migrate sveltekit-2` is that same 1→2 codemod. Run here it
would at best no-op, and at worst double-apply its rewrites — it converts `throw error()` →
`error()`, adds `path` to `cookies.set` calls, and rewrites adapter config, all of which this
codebase already has.

What is actually in preview is **SvelteKit 3**, at `3.0.0-next.27`.

|                                | installed | latest stable | preview           |
| ------------------------------ | --------- | ------------- | ----------------- |
| `@sveltejs/kit`                | 2.70.1    | 2.70.3        | **3.0.0-next.27** |
| `svelte`                       | 5.56.8    | 5.57.1        | —                 |
| `vite`                         | 8.1.5     | —             | —                 |
| `@sveltejs/vite-plugin-svelte` | 7.2.0     | 7.3.0         | —                 |

### Two facts that set expectations

- **There is no codemod for v3.** `svelte-migrate@1.10.3` ships `app-state`, `package`, `routes`,
  `self-closing-tags`, `svelte-4`, `svelte-5`, `sveltekit-2` — and nothing newer. Every change
  below is manual.
- **It drags a TypeScript major with it.** Kit 3 requires TypeScript 6, and the installed
  `typescript-eslint` caps at `<6.0.0`, so that moves too.

### Where the v3 changelog lives

Not on `main` — that branch stops at 2.70.3. The v3 changelog is on the **`version-3`** branch:

```
https://raw.githubusercontent.com/sveltejs/kit/version-3/packages/kit/CHANGELOG.md
```

---

## 2. TypeScript 6, not 7

TypeScript 7 is the Go/native rewrite and is dramatically faster, but **nothing in this toolchain
accepts it yet**. Every relevant package caps below 7:

| package                                | `typescript` peer range |
| -------------------------------------- | ----------------------- |
| `@sveltejs/kit@3.0.0-next.27`          | `^6.0.0`                |
| `@sveltejs/kit@2.70.3`                 | `^5.3.3 \|\| ^6.0.0`    |
| `svelte-check@4.7.6` (latest)          | `^5.0.0 \|\| ^6.0.0`    |
| `typescript-eslint@8.70.0` (latest)    | `>=4.8.4 <6.1.0`        |
| `typescript-eslint@8.46.1` (installed) | `>=4.8.4 <6.0.0`        |

So the ceiling is **TypeScript 6.0.3**. Published 6.x stable releases are `6.0.2` and `6.0.3`;
`typescript@latest` is `7.0.2`.

This is an **ecosystem limit, not a Kit 3 limit** — TS 7 is equally blocked on Kit 2 today, because
`svelte-check` and `typescript-eslint` are the binding constraints. Recheck when `svelte-check`
widens its range; nothing else needs to change for it.

---

## 3. Dependency moves

| package                  | from   | to            | why                                    |
| ------------------------ | ------ | ------------- | -------------------------------------- |
| `@sveltejs/kit`          | 2.70.1 | 3.0.0-next.27 | the migration                          |
| `typescript`             | 5.9.3  | 6.0.3         | Kit 3 peer `^6.0.0`                    |
| `typescript-eslint`      | 8.46.1 | 8.70.0        | 8.46 caps at `<6.0.0` and blocks TS 6  |
| `@sveltejs/adapter-node` | 5.5.7  | 6.0.0-next.12 | peers on `@sveltejs/kit@^3.0.0-next.0` |
| `@sveltejs/adapter-auto` | 7.0.1  | 8.0.0-next.4  | same                                   |
| `vite-plus`              | 0.2.6  | 0.3.3         | only if required — see risk 1          |

Already satisfying Kit 3 and needing no change: `svelte` 5.56.8 (needs ≥5.56.4),
`@sveltejs/vite-plugin-svelte` 7.2.0 (needs v7), `vite` 8.1.5 (needs ^8.0.12),
`svelte-check` 4.7.6 (already accepts TS 6).

### Node floor

Kit 3 requires **Node ≥ 22.17** (`engines.node` on the package is `>=22.17`).

Coolify builds with `NIXPACKS_NODE_VERSION=22`, which pins only the major and currently resolves to
**22.19.0** — so it clears the floor, but by two patch releases. `AGENTS.md` records that this exact
floor-versus-container gap broke the 2026-09-15 deploy when `lint-staged` raised its own floor.
**Pin `NIXPACKS_NODE_VERSION` to an exact version in Coolify before this goes anywhere near
production.**

`vite-plus@0.3.3` wants `^20.19.0 || ^22.18.0 || >=24.11.0` — 22.19.0 also clears that.

---

## 4. Codebase impact — what the scan actually found

Counts and line numbers below are from grepping the tree on 2026-09-19, not estimates.

### 4.1 `$lib` → `#lib` — the largest single change

v3 replaces the `$lib` alias with `#lib` and removes `files.lib` config.

- **533 import sites across 218 files.**
- Mechanical and scriptable, but no codemod exists.
- **`vite.config.ts` needs hand review**, not find-and-replace. Its vitest `alias` block uses
  exact-match regexes written against `$lib` on purpose, with a comment explaining why:
  `/^\$lib\/server\/db$/` must not also match `$lib/server/db/schema`. Those patterns and the
  reasoning both need porting.

### 4.2 Confirmed individual sites

| change                                                                 | where                                                                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `base` removed from `$app/paths`                                       | `src/lib/utils/urls.ts:1` — the only use                                                                                             |
| `goto` `noScroll`/`keepFocus` → single `reset` option                  | `src/routes/results/+page.svelte:53` — the only use                                                                                  |
| `Pathname` → `Path`, `Asset` → `AssetPath` in `$app/types`             | `src/lib/config/sidebarMenu.ts:2,29,85` and `src/lib/components/AppSidebar.svelte:5,13` use `ResolvedPathname` — confirm its v3 name |
| remote function types move to `$app/server`                            | the `.remote.ts` files under `src/lib/api/` plus colocated ones                                                                      |
| `RequestEvent` / `Cookies` move to `$app/server`                       | no file imports these from `@sveltejs/kit` today — likely a no-op                                                                    |
| `handleValidationError` removed; validation errors go to `handleError` | `src/hooks.server.ts`                                                                                                                |

`resolve()` from `$app/paths` **stays**, so the ~40 `resolve()` call sites added for
results/rankings/players are unaffected.

### 4.3 Not applicable to this repo

Verified zero uses: `$app/stores` (removed in v3), `$service-worker` (deleted in v3), param files in
folders, `preloadCode`, live-query `.run()`.

### 4.4 Needs judgement, not a rename

- **`invalidateAll` → `refreshAll`.** Do not blind-rename. The `invalidateAll` that a successful
  remote form triggers is precisely what makes deleting an event refresh `getEvent` and
  `listEventLocations` for a row that no longer exists — the reason
  `tests/integration/event-manage.test.ts:329` carries an `expectConsoleErrors(page)` exemption. If
  `refreshAll` offers finer control, that exemption may come out. See §7.
- **Cookies.** `path` now defaults to `'/'`, and `cookie` v2 requires ASCII-only cookie names. This
  is `better-auth` territory — verify sign-in and session rather than assuming.
- **Server-only directory rules tighten** ("nested server-only directories", "server-only everywhere
  in the project"). `src/lib/results/types.ts` and `src/lib/rankings/breakdown.ts` both
  `import type` from `$lib/server/fpa-api/types`. Type-only imports are erased before the module
  graph, so this should survive — but it is exactly the kind of rule that shifts in a major.
- **Config restructuring.** Svelte config options must now pass through the Vite plugin, so
  `svelte.config.js` changes shape — and that is where `kit.experimental.remoteFunctions` and
  `compilerOptions.experimental.async` live, both of which this app depends on completely. Kit also
  writes its tsconfig to `node_modules/$app/tsconfig`, so `tsconfig.json`'s `extends` changes.

### 4.5 Sweep for these

`error(status, {...})` → `error(status, message, {...})`; `handleError` can now influence status and
receives all errors; external redirects forbidden by default; adapter Vite plugins split into
`pre`/`post`; `@sveltejs/kit/node/polyfills` removed; `getRequest`/`setResponse` now synchronous;
204 responses return no content; `form.error` typed `App.Error | undefined` instead of `any`.

---

## 5. The three real risks

**1. `vite-plus` versus Kit 3 — most likely blocker.**
`vp` owns dev, test and lint in this project (`package.json`: `dev: vp dev`, `test: vp test run`;
note `build` is still plain `vite build`). vite-plus 0.3.3 aliases Vite to its own build —
`"vite": "npm:@voidzero-dev/vite-plus-core@0.3.3"` — while Kit 3 peers on `vite@^8.0.12`. Whether
those reconcile cannot be determined from package metadata; it needs an actual install.
**Test this before touching any code.** If `vp` cannot drive Kit 3, stop and report rather than
rewriting 533 imports for nothing.

**2. `getRequestEvent().params` inside remote functions.**
v3 errors on `event.url`, `event.params` and `event.route` access _inside queries_. Two sites use
it — `src/routes/events/[id]/data.remote.ts:12` and
`src/routes/events/[id]/admin/event-details.remote.ts:51` — and **both are inside `form()`, not
`query()`**, so they read as safe. The wording is narrow enough to verify rather than trust.

**3. `better-auth` on Kit 3.** It hooks `handle` in `src/hooks.server.ts` via `svelteKitHandler`
and sets cookies. Both the hook contract and cookie handling changed.

---

## 6. Order of work

Stages 0 and 1 are worth doing even if the v3 attempt is abandoned — they leave the branch better
off either way.

0. **Baseline.** Confirm green before changing anything:
   `npm run check && npm run test && npm run build`, then the full Playwright suite. Last measured:
   **216 unit tests, 116 integration tests, all passing.**
1. **TypeScript major on its own, still on Kit 2.** `typescript` → 6.0.3 and `typescript-eslint` →
   8.70.0. Kit 2.70.3 already accepts `^6.0.0`, so this stands alone. Fix whatever TS 6 flags and
   commit separately — this isolates a whole major from the Kit changes and is independently
   useful.
2. **Probe the toolchain.** Install Kit 3 + both adapters, then try `vp dev` and `vite build`
   _before writing any application code_. This is risk 1, and it is cheap to answer early.
3. **Mechanical renames.** `$lib` → `#lib` (scripted, with `vite.config.ts` by hand), `base`, the
   `$app/types` renames.
4. **Semantic fixes.** `goto` `reset`; remote-function type imports; `svelte.config.js` and
   `tsconfig.json` restructuring; `handleError` and validation errors; cookies; the §4.5 sweep.
5. **Gate and manual pass.** Full suite plus hands-on: sign in, RSVP, delete an event, browse
   `/results`, expand a rankings row, open a player page.

---

## 7. Context a fresh session needs

**Branch:** `feature/sveltekit-2-update`. The name describes an upgrade that already happened; worth
renaming to something like `feature/sveltekit-3-preview`.

**Uncommitted local change that must travel.** `.env.test` has an uncommitted edit:
`BETTER_AUTH_URL=http://localhost:5174`. The committed value is `5173`, which is **wrong for the
test environment** — Playwright serves on 5174 (`playwright.config.ts:14`, deliberately not 5173),
and with 5173 better-auth refuses the origin and every `/api/auth/*` call 404s, so `auth.setup.ts`
fails and the entire integration suite cannot run. **This should be committed.** If the cloud
environment starts from a clean checkout without it, integration tests will fail immediately and
misleadingly.

**Quality gates** (`AGENTS.md`, no CI — git hooks only):

- pre-commit (~20s): `lint-staged`, `npm run check`, `npm run test`
- pre-push (~2-4 min): `npm run build`, `npm run db:migrate:test`, `npm run test:integration`

**Integration test setup:** `createdb fpa_events_test && npm run db:reset:test`. Reset the test DB
between full runs — the account-deletion test leaves it in a state that breaks `auth.setup.ts` on
the next run.

**Two tests were repaired in the session preceding this research.** If either regresses under Kit 3,
that is Kit 3, not a pre-existing fault:

- `tests/integration/privacy.test.ts:87` — fixed by adding the missing Email column to
  `src/routes/events/[id]/admin/attendees/AttendeeList.svelte`. The layout load had always selected
  `user.email`; no column ever rendered it.
- `tests/integration/event-manage.test.ts:329` — fixed by making `requireEventAccess` in
  `src/lib/server/authz.ts` throw `error(404)` / `error(403)` instead of bare `Error`s, which
  reached the client as 500s. The residual `expectConsoleErrors(page)` exemption is the
  `invalidateAll` behaviour described in §4.4.

**House rules worth reading before editing:** `AGENTS.md` — remote functions only (never
`+page.server.ts` `actions`), Svelte 5 runes only, no `use:enhance`, `untrack` over prop-seeding
effects, and a specific list of shared helpers to reuse.

---

## 8. Verification

```bash
npm run check && npm run test            # 216 unit tests
npx eslint src tests && npm run build
npm run db:reset:test && npx playwright test   # 116 integration tests
npm run dev                              # sign in, RSVP, delete an event, browse /results
```

The integration suite is the real signal: it exercises auth, cookies, remote forms and the
results/rankings/players pages end to end, which is most of the surface Kit 3 changes.

---

## Appendix — unrelated finding: SSR vs client-side rendering for `/results`, `/rankings`, `/players`

Researched in the same session, in response to the question of whether these routes would be faster
as client-side SPAs fetching fpa-api directly. **Recorded here so the measurements are not lost.
Conclusion: no — it would be slower and would undo existing work.**

**The hop in question does not cross the internet.** `fpa-api.fluid-movement.de` and
`fpa-events.fluid-movement.de` both resolve to **65.21.62.132** — the same Hetzner host. The
server→API call is same-host (~1 ms). The expensive hop is browser→Germany, and it exists either
way. Today one user round-trip returns finished HTML; client-side it becomes **two sequential user
round-trips** (shell, then data), because the shell still comes from the same server.

|                  | today                                               | direct from browser                                                     |
| ---------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| rankings payload | **40 KB** (trimmed rows)                            | **275 KB** raw                                                          |
| events index     | 244 KB, fetched once per 5 min, shared by all users | 244 KB **per visitor**                                                  |
| CORS on fpa-api  | not needed                                          | must be added — it currently sends **no** `Access-Control-Allow-Origin` |

It would also undo correctness work, not just speed work: `src/lib/server/fpa-api/eventIndex.ts`
filters the full 914-event index server-side _because_ the upstream `from`/`to` filter compares
dates as strings and silently drops events like `2020-2-8`. Client-side you would either ship all
914 events to every visitor or reintroduce that bug. `getScoringResults` likewise joins two
endpoints server-side against cached standings; in the browser, expanding one player would mean
downloading 275 KB of standings to find their ~15 rows.

Also lost: `FPA_API_URL` is `$env/dynamic/private` by deliberate design
(`src/lib/server/fpa-api/client.ts`), and the SSR'd markup that `src/routes/rankings/+page.svelte:80-91`
documents as being for search engines and no-JS visitors.

Worth noting these routes **already behave like an SPA after first load** — SvelteKit hydrates, and
filtering, paging and expanding are all client-side fetches, not page loads. SSR governs only the
first paint.

If repeat-visit latency is the actual concern, the cheaper lever is HTTP caching on the remote
function responses plus revisiting the 5-minute index TTL, given fpa-api only refreshes hourly.
