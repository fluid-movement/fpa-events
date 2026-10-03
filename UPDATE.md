# SvelteKit 3 migration — findings and plan

> **Status, 2026-10-03: done, and on the stable release.** SvelteKit 3.0.0 shipped and this branch
> now runs it (`@sveltejs/kit` 3.0.0, `@sveltejs/adapter-node` 6.0.0, `@sveltejs/adapter-auto` 8.0.0).
> Sections 1-8 below are the original research, written on 2026-09-19 against the `3.0.0-next.27`
> preview, and are kept as a dated record — their version numbers and open questions are historical.
> **For what actually happened, and what is still outstanding, read [Outcome](#outcome--implemented-2026-09-19) at the end.**

Research done 2026-09-19 on branch `feature/sveltekit-2-update`. Nothing in this document has been
implemented; the working tree is unchanged apart from this file. Written to be picked up cold by a
session with no prior context.

---

## 1. Where things stand

SvelteKit 3 is in preview at **3.0.0-next.27**. This document is the path to it from what is
installed today.

|                                | installed | latest stable | preview           |
| ------------------------------ | --------- | ------------- | ----------------- |
| `@sveltejs/kit`                | 2.70.1    | 2.70.3        | **3.0.0-next.27** |
| `svelte`                       | 5.56.8    | 5.57.1        | —                 |
| `vite`                         | 8.1.5     | —             | —                 |
| `@sveltejs/vite-plugin-svelte` | 7.2.0     | 7.3.0         | —                 |

### Two facts that set expectations

- **There is no codemod.** `svelte-migrate@1.10.3` ships no v3 migration, so every change below is
  manual.
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

**Branch:** `feature/sveltekit-2-update`.

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

---

# Outcome — implemented 2026-09-19

The migration above was carried out. This section records where reality differed
from the plan, because several of the plan's assumptions turned out to be wrong.

## What the plan got right

- No codemod exists; every change was manual.
- TypeScript 6 is required and 7 is still blocked by `svelte-check` and
  `typescript-eslint`. 6.0.3 remains the ceiling.
- `$lib` -> `#lib` is the largest mechanical change (533 specifiers, 219 files).
- `vite.config.ts` did need hand review; its vitest aliases are exact-match
  regexes where `$` is both an anchor and part of the alias.
- Risk 2 was a false alarm: both `getRequestEvent().params` sites are inside
  `form()`, not `query()`, and neither trips the new restriction.
- `ResolvedPathname` survives under that name (only `Pathname` -> `Path` and
  `Asset` -> `AssetPath` were renamed, neither of which this app uses).

## What the plan missed

**1. `$env/*` is deleted, not renamed.** This is the largest single omission.
Variables are now declared in `src/env.ts` with `defineEnvVars` and imported
from `$app/env/private` / `$app/env/public` as _named exports_, so every
consumer changed shape and the two tests that mutated `env.X` needed
live-binding mocks. `$app/environment` also folded into `$app/env`.

**2. Kit 3's generated tsconfig no longer supplies `include`/`exclude`.** It
moved to `node_modules/$app/tsconfig`, from where relative globs cannot work,
so the project tsconfig has to carry them. Until it did, `svelte-check`
walked `build/` and `tools/migrate` and reported 24220 errors. The true
figure was 41.

**3. Remote form fields must be built by `fields.<name>.as(...)`.** Not in the
changelog's breaking list, and the single biggest source of runtime breakage:
every remote form 500s with "Form contained a field that wasn't created with
form.fields.as(...)" until it is converted. SvelteKit encodes the form id and
a type prefix into each field's `name`, so there is no escape hatch. This
reached 9 forms and ~37 fields, including four shared components
(`EventLocationInput`, `ImageUpload`, `VenueLocationPicker`, `RichTextEditor`)
that previously named their own hidden inputs and now take the owning form's
fields as a prop.

**4. `svelte.config.js` is refused outright**, and the `kit` namespace inside it
is gone. Options pass through `sveltekit(...)` in the Vite config. Because
`eslint.config.js` also imports them, they live in `svelte-options.js`.

**5. `resolve()` type-enforces route ids.** 27 interpolated calls became
`resolve('/events/[id]', { id })`.

**6. `page.url` is immutable**, so `searchParams` no longer feeds
`SvelteURLSearchParams` directly.

## Risk 1 resolved: `vp` cannot run the Kit 3 dev server

Not a peer-range problem as the plan guessed — `vp dev` fails outright with
"The configured Vite SSR environment must be a RunnableDevEnvironment".

vite-plus 0.3.3 does not fix this cleanly: it requires `vite` to be aliased to
`npm:@voidzero-dev/vite-plus-core`, and its `vp migrate` rewrites `vitest`
imports to `vite-plus/test` across all 23 test files. That couples the whole
suite to vite-plus and is a tooling decision in its own right, so it was not
taken. `dev` and `dev:test` now run plain `vite dev`; vite-plus stays at 0.2.x
driving `npm run test`.

**This is the open decision for whoever picks this up:** either accept plain
`vite dev`, or move the project to vite-plus 0.3.x deliberately, alias and
import rewrite included.

## Risk 3: better-auth — clear

No better-auth release supports Kit 3 (1.7.5 still peers `@sveltejs/kit@^2.0.0`),
so its optional peer is pinned to the root Kit with an `overrides` entry. In
practice nothing broke: sign-up, sign-in, sessions, email verification, the
forgot-password flow and cookie handling all pass.

## Where it landed

### Upgraded to the 3.0.0 release, 2026-10-03

SvelteKit 3 left preview. The three prerelease pins moved to their stable releases — `@sveltejs/kit`
3.0.0, `@sveltejs/adapter-node` 6.0.0, `@sveltejs/adapter-auto` 8.0.0 — and the existing carets
picked up `@sveltejs/vite-plugin-svelte` 7.3.1, `vite` 8.3.2 and `typescript-eslint` 8.71.0.
**No code changes were needed:** every gate passed unchanged, and the integration suite returned the
same 92 / 23 / 1 as the preview run.

Two things did not improve and are unchanged above:

- **better-auth 1.7.7 still peers `@sveltejs/kit@^2.0.0`**, so the `overrides` entry stays. Nothing
  actually breaks; it is only npm's resolver that needs telling.
- **vite-plus 1.0.0 is out, and still does not help.** It continues to alias `vite` to its own core
  build and now moves to vitest 5, so adopting it is a larger decision than before, not a smaller
  one. `dev`/`dev:test` stay on plain `vite dev`.

Kit 3.0.0 also raised its Svelte floor to `^5.57.1` (from `^5.56.4`); the branch was already there.

One note for the next person: the `fields.as(...)` requirement described above still does not appear
anywhere in the released changelog's breaking-changes list, despite being the single largest source
of runtime breakage. Do not expect to find it documented.

### The suite

The integration suite matches the pre-migration baseline exactly: **92 passed,
23 failed, 1 skipped**, with the 23 being the same specs that already failed
before any of this — `/rankings`, `/results`, `/players` and the two console-error
canaries, all of which need `fpa-api.fluid-movement.de`. They were verified as
failing identically on Kit 2 before the migration started; they are a network
limitation of the machine this ran on, not a regression. **Re-run them somewhere
with access to fpa-api before shipping**, since they cover the remote-function
and caching surface most exposed to the Kit 3 changes.

Also green: `npm run check` (0 errors / 3213 files), 216 unit tests, eslint,
`prettier --check .`, `npm run build`, and `vite dev` serving pages.

## Deployment notes

- `engines.node` is now `>=22.17` (Kit 3's floor). Coolify's
  `NIXPACKS_NODE_VERSION=22` resolves to 22.19.0, which clears it by two patch
  releases. **Pin it to an exact version before this ships.**
- adapter-node 6 removed the `ORIGIN` environment variable in favour of
  `paths.origin`. Nothing in the repo sets it; if Coolify does, it is now inert.
