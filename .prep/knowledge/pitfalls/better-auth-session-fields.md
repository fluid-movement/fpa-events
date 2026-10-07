---
type: pitfall
title: Custom user columns are not on session.user
description: role, showAttendance and calendarToken must be read from the DB, not from locals.user.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:45:35Z
scope:
  - src/hooks.server.ts
  - src/lib/server/auth.ts
  - src/routes/settings/privacy
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Custom user columns are not on session.user

`user` has app columns that Better Auth does not know about: `role`,
`show_attendance` and `calendar_token`. They are not declared as Better Auth
`additionalFields`, so `auth.api.getSession` and `locals.user` never carry
them.

- `role` is read from the DB in `src/hooks.server.ts` and exposed as
  `locals.role`. Use `locals.role`, not `locals.user.role`.
- `showAttendance` is read straight from the table by `getPrivacySettings`
  (`src/routes/settings/privacy/data.remote.ts`).
- `calendarToken` goes through `ensureCalendarToken` /
  `regenerateCalendarToken` (`src/lib/server/utils/calendar.ts`).

A new user column has to be read the same way, unless it is registered as an
`additionalFields` entry in `auth.ts`. That would also make it writable
through `/api/auth/update-user`, so do not register `role` this way.
