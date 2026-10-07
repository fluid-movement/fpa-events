---
type: convention
title: 'Authorization: owners, co-organizers and admins'
description: Who may do what to an event, and which authz guard to use where.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:45:34Z
scope:
  - src/lib/server/authz.ts
  - src/routes/events/[id]/admin
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Authorization: owners, co-organizers and admins

All permission logic is in `src/lib/server/authz.ts`. Pages and remote
functions call these helpers and never compare ids inline.

## Roles

| Who              | How recognised                                | May                                                                      |
| ---------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| Signed-in user   | `locals.user`                                 | RSVP, create events, settings                                            |
| Event **owner**  | `events.user_id === user.id`                  | everything on the event, including delete                                |
| Site **admin**   | `user.role === 'admin'` (via `locals.role`)   | same as owner on every event                                             |
| **Co-organizer** | `event_user` row with `status = 'organizing'` | manage the event (details, schedule, venues, invites), but not delete it |

The creator also gets an `organizing` row on create. Older events may lack it,
so `organizingEvents` also matches on `events.user_id`.

## Helpers

- `isEventManager(event, userId, role)`: despite the name, this is the
  _owner-level_ check (creator or admin).
- `canManageEvent(event, userId, role)`: owner, admin or co-organizer.
- `requireEventManager(eventId)`: remote functions; loads the event and throws
  `error(401/404/403)`. Admits co-organizers.
- `requireEventOwner(eventId)`: same, owner/admin only. Use for destructive
  actions (`deleteEvent`).
- `requireSignedIn(locals)` (load, 307) and `requireSignedInRequest()` (remote, 302) for plain sign-in checks. `requireUser()` throws a bare
  `Error('Unauthorized')` and is only used internally.

The manage area's `+layout.server.ts` uses `canManageEvent` and redirects
outsiders to the public page. Child loads rely on that layout guard, but
**remote functions must guard themselves**: they are callable endpoints, and
the layout does not run for them. After guarding, scope every write to the
authorised event id. Checking `data.eventId` and then updating by a row id
alone lets the caller touch another event's rows (tracked as a bug for
schedules and venues).

There is no `/admin` area and no admin UI for roles; `role` is set in the
database.
