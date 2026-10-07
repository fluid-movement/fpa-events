---
type: feature
title: Personal calendar feed
description: Token-authenticated .ics feed of the events a user attends.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:46:38Z
scope:
  - src/routes/api/calendar
  - src/lib/server/utils/calendar.ts
  - src/lib/api/calendar.remote.ts
  - src/lib/components/CalendarFeedPanel.svelte
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Personal calendar feed

Each user can subscribe to an iCalendar feed of the events they are attending.

- Token: `user.calendar_token`, a random UUID created lazily by
  `ensureCalendarToken` when `/dashboard` or `/attending` loads, and replaced
  by `regenerateCalendarToken` through the shared `regenerateToken` form
  (`src/lib/api/calendar.remote.ts`). Regenerating breaks existing
  subscriptions on purpose.
- Feed: `GET /api/calendar/[token]/feed.ics` (no session; the token is the
  credential). It lists every `attending` row (past and future, organizing
  rows excluded) as a VEVENT with uid `<eventId>@fpa-events`, the location text
  and the event URL as the description. Response: `text/calendar`,
  `Cache-Control: max-age=3600, private`.
- UI: `CalendarFeedPanel.svelte` shows the URL in a `CopyField`, with
  regenerate behind a confirm.

Covered by `tests/integration/calendar-feed.test.ts`.
