# TODO

## Observability

Parked 2026-07-25, while fixing migrations not running on deploy.

Context: a production 500 was only diagnosable by reading Coolify's Logs tab, and the
stack trace pointed at minified bundle chunks rather than source.

- [ ] **Add `--enable-source-maps` to the Coolify Start Command.** The build already emits
      source maps (175 chunks, 175 `.map` files) but Node ignores them for stack traces
      unless told to. Verified locally: `at t (bundle.js:1:21)` becomes
      `at loadEventThatFails (original.ts:3:8)`. Cheapest possible win — do this first.
- [ ] **Add a `handleError` hook** in `src/hooks.server.ts` (there is none today, so
      SvelteKit's default is in use — it logs `[status] METHOD /path` plus the stack, and
      nothing else). Log structured context: path, method, user id, and a correlation id
      that can be quoted back to a user reporting a problem. This is also exactly where
      Sentry would plug in.
- [ ] **Decide on error tracking.** Coolify logs are ephemeral (lost on redeploy), have no
      alerting, and never see client-side errors. Options: - `@sentry/sveltekit` on Sentry's **EU data region** with `sendDefaultPii: false`
      — recommended; free tier is 5k events/month. EU region matters given the GDPR
      care taken elsewhere in this app. - Self-hosted GlitchTip (Sentry-API-compatible, available as a Coolify one-click
      service) — keeps data on the Hetzner box, costs another container plus its
      Postgres to maintain.

## UI

- make event date picker look better, better UX

## Cleanup pass — 2026-09

A whole-project DRY and consistency sweep. No UI or UX changes; the shared pieces it
introduced are listed under "Reach for the shared helpers" in `AGENTS.md`. Two things
it deliberately left alone, in case either looks like an oversight later:

- **"N attending" is counted two different ways.** The public browse pages count only
  `event_user` rows with `status = 'attending'`; the dashboard and organizing pages count
  every row, organizers included. Both behaviours are preserved (see `eventUserCounts`
  in `src/lib/server/utils/events.ts`) because unifying them changes numbers people see.
  Worth a decision at some point.
- **The optimistic RSVP `$effect` on `events/[id]`.** It mirrors loaded data into local
  state, which is normally the anti-pattern — here it is the reset that hands control
  back to the server after a revalidation, and the alternatives (a `{#key}` block) cost
  focus on the button.

## Design language — remaining phases

Parked 2026-07-26. Phases 1–3 of the "Lit Glass" redesign are done: design tokens,
mobile-first control sizing, the mobile bottom tab bar, and every page type rebuilt on
a shared component set. Phases 4 and 5 below are what's left.

Start here before touching anything: the tokens and surface classes live in
`src/routes/layout.css` (`.surface`, `.surface-glass`, `.surface-sunken`,
`.surface-row`, plus the `@layer base` type scale), and the shared components live in
`src/lib/components/layout/` — `PageShell`, `PageHeader`, `Section`, `EmptyState`,
`SegmentedTabs`, `DataList`, `ConfirmDialog`, `CopyField`, `FormStatus`,
`DividerLabel`, `MobileTabBar`. Prefer composing these over new one-off markup; they
exist because the audit found 5 tab bars, 5 destructive-confirm patterns, 5 form
idioms, 4 tables and 4 empty-state treatments doing the same jobs differently.

Safety net worth knowing about: `tests/integration/helpers/console.ts` exports
`installErrorGuard(test)`, which fails any test in a spec on an uncaught exception or
`console.error`. It is now wired into every integration spec.
`tests/integration/session.test.ts` additionally asserts the auth endpoint answers on
the serving origin and that the sidebar reaches its signed-in state after hydration —
a single canary for "hydration ran and `/api/auth/*` is reachable". Keep these passing.

### Phase 4 — polish

- [x] **Give `/events/[id]` a real pending state.** Added a `failed` snippet only
      (reusing `EmptyState`, matching `+error.svelte`'s copy, with a "Try again" ->
      `reset()` action). No `pending` snippet: nothing inside the boundary suspends
      (data is SSR-loaded via `+page.server.ts`), so one would never render — same
      tradeoff `src/routes/rankings/+page.svelte:80-91` already documents.
- [x] **Use the skeleton component that already exists.** Wired up in the event admin
      area only (`src/routes/events/[id]/admin/+layout.svelte`), which awaits
      `getEvent`/`listEventLocations` client-side with no prior loading UI. Wrapped the
      header + setup checklist in a `<svelte:boundary pending={...}>` built from
      `<Skeleton>` primitives; the tab bar and child routes sit outside it so they're
      never blocked on the header. Other candidates (e.g. `settings/privacy`) left for
      a future pass.
- [x] **Make submit feedback consistent.** Standardized every remote-form submit
      button on `formAction.pending > 0` (disable + label swap): `events/create`
      (already correct), the admin event-details form, invite generate/regenerate,
      schedule add/edit item, and the admin schedule "Save Location" dialog. The four
      auth pages keep their local `loading` flag since they call `better-auth` client
      methods directly, not a remote `form()` — both idioms are now documented in
      `AGENTS.md`'s Code Style section.
- [x] **Focus-visible audit.** `CopyField` and `SegmentedTabs` already had the correct
      `focus-visible:ring-[3px] ring-ring/50` classes — confirmed by tabbing through.
      `MobileTabBar`'s links and "More" button had none (fell through to the native
      outline); added the same ring classes there.
- [x] **Reduced-motion sweep.** `tabs-content`'s `animate-in` was already gated via
      `motion-reduce:animate-none`. Added `prefers-reduced-motion: reduce` guards for
      `EventCalendarCard`'s `.glow`/`.chip` hover transitions and for `.surface-row`
      (extended the existing reduced-motion block in `layout.css`).

- [x] **Convert the last form action to a remote function.**
      `src/routes/settings/profile` was the only `+page.server.ts` `actions` left in the
      app, violating AGENTS.md's "always use remote functions" rule. It now posts through
      `settings/profile/data.remote.ts`, which forwards to Better Auth's
      `/api/auth/update-user` with the request's own `fetch` so the session cookie rides
      along. Done as part of the 2026-09 cleanup pass.

### Phase 5 — event hero layouts

Organizers upload both banner-shaped and upright images. Today `events/[id]/+page.svelte`
renders one fixed hero (`object-cover`, `max-h-56 md:max-h-80`), so a portrait poster is
centre-cropped to a horizontal strip. Give it two layouts, chosen automatically.

- [ ] **Auto-detect from the dimensions already stored.** `events.pictureWidth` /
      `events.pictureHeight` (`src/lib/server/db/schema.ts:38-39`) are populated by
      `ImageUpload.svelte`, so no new data is needed for the default. Ratio ≥ 1.4 →
      `banner`; below → `split`.
- [ ] **Build the two layouts.** `banner`: full-width, `aspect-[21/9]` on desktop and
      `aspect-[16/9]` on mobile, keeping the existing gradient scrim.
      `split`: `md:grid-cols-[1fr_minmax(0,22rem)]` with details left and the image right
      at its natural ratio, capped `max-h-[32rem]`. **Both collapse to the same single
      stack below `md:`** (image first, capped `max-h-[60vh]`, uncropped) — so this is a
      desktop-only refinement and shouldn't be over-invested in.
- [ ] **Add the override column.** Nullable `heroLayout` on `events`:
      `'banner' | 'split' | null`, null meaning auto — so replacing the image re-derives
      the layout rather than getting stuck on a stale choice. `npm run db:generate` then
      `npm run db:migrate`. **The production DB ports are firewalled, so the migration
      has to be run server-side from the Coolify terminal, not from a laptop.** Keep
      `src/lib/server/db/seed.ts` in sync (see the Seed Script rule in `AGENTS.md`).
- [ ] **Expose the override quietly.** Three radio cards (Auto / Banner / Portrait) in
      `EventDetailsForm.svelte`, under the cover-image field. Reuse the checked styling
      already in `src/lib/components/ui/field/field-label.svelte`
      (`has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5`)
      rather than hand-rolling it. Auto is the default and should be labelled as such —
      most organizers should never need to touch this.
- [ ] **Tell people what to upload.** Add recommended crops to `ImageUpload.svelte`;
      right now there is no guidance at all, which is why mismatched images arrive.
