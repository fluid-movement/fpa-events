---
type: component
title: Stack and source layout
description: What lives where in src/ and which library does which job.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:44:51Z
scope:
  - src
  - svelte-options.js
  - vite.config.ts
  - src/env.ts
  - package.json
  - tsconfig.json
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Stack and source layout

SvelteKit 3 on Svelte 5 and TypeScript 6, with `experimental.remoteFunctions`
and the compiler's `experimental.async` both on. Kit 3 refuses a
`svelte.config.js`: the options live in `svelte-options.js` and reach Kit
through `sveltekit(svelteOptions)` in `vite.config.ts`; `eslint.config.js`
imports the same file. Components may
`await` in their script and markup, and that is how the rankings/results
panels and the event admin header load their data.

## Where things live

- Imports use `#lib/...`, a real `package.json` subpath import (`imports`),
  mirrored in `tsconfig.json` `paths` and `components.json` aliases. Kit 3
  removed `$lib`.
- Environment variables are declared in `src/env.ts` (`defineEnvVars`) and
  read from `$app/env/private` / `$app/env/public`. All are runtime and
  optional; consumers treat unset and blank alike.

- `src/routes/` — file-based routes. Reads mostly come from `+page.server.ts`
  loads; every write goes through a `*.remote.ts` next to its route (see
  `/conventions/remote-functions.md`). Two plain endpoints exist:
  `api/events/upload-image` (multipart image upload to R2) and
  `api/calendar/[token]/feed.ics`. `/api/auth/*` is Better Auth, mounted by
  `svelteKitHandler` in `src/hooks.server.ts`.
- `src/lib/api/` — remote functions shared by several routes: fpa-api queries
  (rankings, results, players) and the calendar-token regenerate form.
- `src/lib/server/` — server-only: `auth.ts`, `authz.ts`, `db/`, `email.ts`,
  `r2.ts`, `turnstile.ts`, `password.ts`, `eventForm.ts`, `fpa-api/`,
  `utils/events.ts` and `utils/calendar.ts`.
- `src/lib/components/` — app components. `layout/` is the shared page kit
  (PageShell, PageHeader, Section, DataList, EmptyState, SegmentedTabs,
  ConfirmDialog/ConfirmSubmit, FormStatus, MobileTabBar…); `rankings/`,
  `results/` and `schedule/` hold feature components; `ui/` holds vendored
  shadcn-svelte primitives (owned code, but not tested).
- `src/lib/utils/` — pure helpers: `dates.ts` (every rendered date format),
  `html.ts`, `collections.ts`, `attendees.ts`, `urls.ts`, `numbers.ts`.
- `src/lib/rankings/`, `src/lib/results/` — shared types and pure transforms for
  the fpa-api views (a `.remote.ts` file may only export remote functions).
- `src/lib/config/` — sidebar menu and the mobile top-bar page titles.
- `tools/migrate/` — standalone legacy migrator, its own npm package.

## Libraries

| Concern                  | Library                                                    |
| ------------------------ | ---------------------------------------------------------- |
| DB                       | Postgres, `postgres` driver, Drizzle ORM + drizzle-kit     |
| Auth                     | Better Auth (email + password), bcryptjs for legacy hashes |
| Validation               | Valibot (remote-function schemas)                          |
| UI                       | Tailwind 4, bits-ui/shadcn-svelte, Lucide, mode-watcher    |
| Rich text                | Tiptap 3 in, sanitize-html out                             |
| Maps                     | Leaflet (dynamic import only), Photon geocoding            |
| Mail / storage / captcha | Mailgun (EU), Cloudflare R2 via S3 SDK, Turnstile          |
| Calendar                 | ical-generator                                             |
| IDs                      | ULID, lowercased, for text primary keys                    |

Styling uses the "Lit Glass" tokens and surface classes in
`src/routes/layout.css` (`.surface`, `.surface-glass`, `.surface-sunken`,
`.surface-row`). Prefer the layout kit over one-off markup.
