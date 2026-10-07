---
type: feature
title: 'Events: browse, create, edit, delete'
description: Public event pages, the create/edit form, cover images in R2, and event deletion.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:46:38Z
scope:
  - src/routes/events
  - src/routes/+page.server.ts
  - src/routes/+page.svelte
  - src/lib/server/eventForm.ts
  - src/lib/server/r2.ts
  - src/routes/api/events
  - src/lib/components/ImageUpload.svelte
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Events: browse, create, edit, delete

## Public pages

- `/` (`src/routes/+page.server.ts`): the next upcoming event as a hero, up
  to five more, a stats line ("N events this year · M countries"; countries are
  counted from the last comma part of `events.location`) and a Leaflet map of
  upcoming events that have an `event_location`.
- `/events`: upcoming events (`start_date > now`) grouped by month
  (`groupEventsByMonth`), with attendee counts and the viewer's own status
  (`withUserStatus`). The year links come from `getArchiveYears`.
- `/events/past/[year]`: every event starting in that calendar year (including
  upcoming ones in the current year), same grouping.
- `/events/[id]`: details, cover image, sanitized description, schedule,
  attendee peek and the RSVP control (see `/features/rsvp-and-attendance.md`).
  Owners, admins and co-organizers see a link to the manage area.

"Upcoming" means `start_date` is in the future. An event that has started is
past, even on a multi-day event, and RSVP closes at the start.

## Create and edit

- `/events/create` (signed-in) posts `createEvent`
  (`src/routes/events/create/data.remote.ts`). It checks Turnstile, inserts the
  event with a lowercased ULID, inserts the creator's `organizing` row and
  redirects to `/events/[id]/admin`.
- Edit is `updateEvent` in `src/routes/events/[id]/admin/event-details.remote.ts`
  (manager-level guard). It redirects back to the manage index.
- Both share `eventFormSchema`, `parsePictureFields` and
  `resolveEventLocationId` from `src/lib/server/eventForm.ts`. Dates arrive as
  `yyyy-mm-dd` and are stored as `new Date(string)`, i.e. UTC midnight. The
  edit form turns them back with `toISOString().slice(0, 10)`. Keep the two
  sides symmetric or dates shift by a day. The server does not yet check that
  the end is not before the start.
- Location: `location` is the free display string. The city fields are filled
  only when a Photon suggestion was picked, and only a complete set updates
  `event_location_id` (see `/components/geolocation-and-maps.md`).
- Description: Tiptap HTML, stored raw and sanitized on read (see
  `/pitfalls/rich-text-sanitizing.md`).

## Cover images

`ImageUpload.svelte` POSTs the file to `/api/events/upload-image` (signed-in,
`image/*`, ≤ 10 MB). That endpoint stores it in R2 under `events/<ulid>.<ext>`
with a one-year immutable cache header and returns the public URL. The
component measures `naturalWidth/Height` and submits URL + dimensions as
hidden fields. On edit, a replaced picture is deleted from R2 on a best-effort
basis. The `picture` field is currently trusted as sent (tracked as a security
bug). The hero is one fixed `object-cover` layout; banner/portrait layouts are
a planned feature.

## Delete

`deleteEvent` (`delete-event.remote.ts`) needs owner level
(`requireEventOwner`). It deletes the R2 picture, then the event (cascading to
`event_user`, magic links, schedules and venues), and redirects to `/events`.
The UI is the manage area's `DangerZone` using `<ConfirmSubmit>`.
