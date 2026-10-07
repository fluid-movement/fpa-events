---
type: feature
title: Laravel parity
description: 'Each legacy Laravel feature and its status in the new app: done, dropped or missing.'
status: stable
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T12:08:19Z
scope:
  - src/routes
---

# Laravel parity

What the legacy Laravel app (events.freestyledisc.org) did, and where each
feature stands here. Scope decisions are explained in
`/decisions/product-scope.md`; open gaps are prep issues.

| Laravel feature | Status here |
| --- | --- |
| Sign up, sign in, password reset, email verification | Done (Better Auth). Migrated users are marked verified |
| Rate-limited login | Better Auth's built-in rate limiter, plus Turnstile when configured |
| Re-confirm password before sensitive actions | **Missing** (account deletion does not ask) |
| Upcoming calendar grouped by month, past archive by year | Done (`/events`, `/events/past/[year]`) |
| Event detail, create, edit, delete; R2 image with stored dimensions | Done |
| Picture deleted from R2 when the event is deleted | Done |
| RSVP toggle, attendee count | Done; adds a public attendee list with a privacy opt-out |
| Co-organizers via a 48 h magic link | Done (`/invite/[token]`) |
| Event admin tabs: attending, schedule, organizers | Done, plus details/edit and venue management |
| Schedule items with location and coordinates | Done; venues are reusable per event (`schedule_locations`) |
| Home: next-event hero + upcoming grid | Done, plus stats line and map |
| `/user/attending` with countdowns, `/user/organizing` | Done (`/attending`, `/organizing`, `/dashboard`) |
| Profile and password settings | Done, plus privacy and account deletion |
| Legal notice | Done, plus privacy policy |
| Rankings page (no data in Laravel) | Done, from fpa-api, plus results and player pages |
| Divisions, rounds, pools, teams, judging, QR codes | Dropped |
| Players, memberships, admin members CRUD, membership dashboard | Dropped (2026-10-07) |
| Sentry error logging | Not yet (open decision) |
| Laravel Pulse, contact page | Dropped |

New here, with no Laravel counterpart: the personal `.ics` calendar feed, maps
(home page and venue picker), Turnstile, and the attendance privacy setting.

Legacy enums that still matter for migrated data: `event_user.status` values
`attending` / `organizing` (same strings), and `user.role` `user` / `admin`.
