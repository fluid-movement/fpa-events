---
type: feature
title: Event management area
description: 'The /events/[id]/admin tabs: details, attendees, schedule and venues, co-organizer invites.'
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:46:38Z
scope:
  - src/routes/events/[id]/admin
  - src/routes/invite
  - src/lib/components/schedule
status: stable
confirmed_commit: ede69b20148e2ada7a795831e7c35de4344bf2fd
---

# Event management area

`/events/[id]/admin/*`, for owners, admins and co-organizers. The guard and the
shared chrome data live in `+layout.server.ts`: event, `isOwner`, attendee rows
with emails, the magic link and the schedule count. The layout also awaits
`getEvent` and `listEventLocations` client-side behind a `<svelte:boundary>`
skeleton, and the tab bar sits outside the boundary.

## Tabs

| Route             | What                                                                                | Writes                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin/`          | Read-only details (`EventDetailsView`), `SetupChecklist`, `DangerZone` (owner only) | `deleteEvent`                                                                                                                                                        |
| `admin/edit`      | `EventDetailsForm`                                                                  | `updateEvent` (`event-details.remote.ts`)                                                                                                                            |
| `admin/attendees` | `AttendeeList`: every `event_user` row with name, email and status                  | —                                                                                                                                                                    |
| `admin/schedule`  | Schedule items + venues                                                             | `addSchedule`, `updateSchedule`, `deleteSchedule` (`schedule.remote.ts`); `createEventLocation`, `deleteEventLocation`, `listEventLocations` (`locations.remote.ts`) |
| `admin/invites`   | Co-organizer magic link                                                             | `generateLink`, `regenerateLink` (`magic-links.remote.ts`)                                                                                                           |

`SetupChecklist` (unit-tested) renders a list the layout builds: event details,
cover image, schedule, venue locations, co-organizers. Each item has a `done`
flag and a link to its tab.

## Schedule and venues

Schedule items have a name, start and end (end must be after start, checked in
`scheduleValues`), an optional venue and an optional Tiptap description.
Venues (`schedule_locations`) belong to one event. A venue has a name, an
optional address and an optional position picked with `VenueLocationPicker`
(Photon + draggable Leaflet pin). The schedule load geocodes the event's
`location` text as a map-centre fallback when the event has no
`event_location`.

Known gaps: schedule descriptions are rendered unsanitized, and the
update/delete writes are not scoped to the event (both tracked as security
bugs).

## Co-organizer invites

A manager generates one 48-hour magic link (`event_magic_links`).
Regenerating deletes the old one first. Visiting `/invite/[token]`:

- unknown token: 404; expired: an "expired" page;
- signed out: redirect to `/sign-in?redirect=/invite/<token>`, but sign-in
  currently ignores `redirect` (tracked as a bug);
- signed in: upserts the user's `event_user` row to `organizing`, replacing an
  RSVP, and redirects to the event.

The link is reusable by anyone until it expires.
