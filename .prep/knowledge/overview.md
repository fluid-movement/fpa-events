---
type: overview
title: FPA Events — project overview
description: 'Entry point: what FPA Events is, how it is built, and links to every knowledge entry.'
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T10:06:19Z
status: stable
---

# FPA Events

A SvelteKit rebuild of the Freestyle Players Association events platform
(events.freestyledisc.org, previously a Laravel app). Freestyle frisbee players
find, RSVP to, create and run events; the site also shows world rankings and
competition results pulled from the separate **fpa-api** service. The goal is
feature parity with the Laravel app, then a one-time data cutover
(`tools/migrate/`).

Stack: SvelteKit 3 + Svelte 5 runes (experimental async + remote functions),
TypeScript 6,
PostgreSQL via Drizzle, Better Auth (email + password, email verification),
Tailwind 4 with vendored shadcn-svelte/bits-ui, Tiptap, Leaflet + Photon,
Mailgun, Cloudflare R2 and Turnstile. Deployed to Coolify (Hetzner) with
`adapter-node` 6; `vp` (Vite+) drives unit tests and dependency management,
while `dev` runs on plain vite since the Kit 3 upgrade (see `UPDATE.md`).

`AGENTS.md` holds the binding coding rules; the entries below explain the
system those rules apply to.

## Platform and tooling

- [Stack and source layout](/architecture/stack-and-layout.md)
- [Remote functions and shared helpers](/conventions/remote-functions.md)
- [Build, quality gates and deploy](/architecture/build-and-deploy.md)
- [Testing](/conventions/testing.md)
- [Deploy Node is older than dev Node](/pitfalls/deploy-node-version.md)

## Data and identity

- [Database schema, migrations and seed](/components/database.md)
- [Authentication](/components/auth.md)
- [Authorization: owners, co-organizers and admins](/conventions/authorization.md)
- [Custom user columns are not on session.user](/pitfalls/better-auth-session-fields.md)

## Events

- [Events: browse, create, edit, delete](/features/events.md)
- [RSVP, attendee lists and privacy](/features/rsvp-and-attendance.md)
- [Event management area](/features/event-management.md)
- [Personal calendar feed](/features/calendar-feed.md)
- [Geolocation and maps](/components/geolocation-and-maps.md)
- [Email](/components/email.md)
- [Rich text is sanitized on read, not on write](/pitfalls/rich-text-sanitizing.md)

## Rankings and results

- [fpa-api client](/components/fpa-api.md)
- [Rankings, results and player pages](/features/rankings-and-results.md)

## Legacy migration

- [Laravel → fpa-events data migration](/features/legacy-migration.md)
- [Laravel parity](/features/laravel-parity.md)

## Decisions

- [Product scope relative to the Laravel app](/decisions/product-scope.md)
- [One dark theme, no light mode](/decisions/dark-only-theme.md)

## Where else to look

prep is the single source of truth: knowledge here, work in `.prep/issues`. The
old `docs/` folder was retired into it on 2026-10-07. `AGENTS.md` holds the
binding coding rules; `UPDATE.md` is the record of the SvelteKit 3 migration;
`tools/migrate/README.md` is the cutover runbook. The README's deploy section
and its links to `docs/*` files are stale (tracked as an issue). `TODO.md` at the
root predates prep; its open items are filed as issues.
