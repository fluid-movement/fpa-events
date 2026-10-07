---
type: decision
title: Product scope relative to the Laravel app
description: What was dropped (judging, divisions, membership), what was kept and rebuilt differently, and why there is no /admin area.
status: stable
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T12:08:19Z
scope:
  - src/lib/server/db/schema.ts
  - tools/migrate/src/migrate.ts
---

# Product scope relative to the Laravel app

The new app aims for parity with events.freestyledisc.org **for events**, then
a one-time cutover. Several Laravel features are deliberately not carried
over. Feature-by-feature status is in `/features/laravel-parity.md`.

## Dropped

- **Divisions, rounds, pools, teams and the judging system** (Simple 1–9, Vibes,
  Custom Fields, QR-code judge pages). They were never finished in Laravel and
  nobody used them. Competition results and rankings now come read-only from
  fpa-api (`/features/rankings-and-results.md`).
- **Players and membership management**: player records, yearly
  `active_years` memberships (Standard / Platinum / Juniors / FirstTimer /
  Group), member numbers, the `/admin/members` CRUD and the membership
  dashboard. Decided with the user on 2026-10-07. `tools/migrate` does not
  carry those tables across; the final legacy database dump is their archive.
- The unused contact page, and Laravel Pulse monitoring.

Consequently there is no `/admin` area. Site admins are `user.role = 'admin'`,
set in the database, and their only extra power is owner-level access to every
event (`/conventions/authorization.md`).

## Kept, rebuilt differently

- IDs: **ULID text primary keys**, as in Laravel, so legacy rows keep their ids
  and URLs, and re-running the migration is deterministic. New ids are
  lowercased; migrated ones keep their original form.
- Auth: Better Auth instead of Laravel Breeze. Legacy bcrypt hashes keep
  working (`/components/auth.md`). Laravel's re-confirm-password step for
  sensitive actions has no equivalent yet.
- Images: R2, copied from the legacy bucket into the app's own bucket at
  migration time, rather than sharing the legacy bucket.
- Geocoding: Photon (free, OSM) instead of the Google Geocoding API.
- Error tracking: Laravel used Sentry; here it is an open decision.
