---
type: feature
title: RSVP, attendee lists and privacy
description: event_user statuses, toggleRsvp, the two attendee-count definitions and the show-attendance opt-out.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:46:38Z
scope:
  - src/routes/events/[id]
  - src/routes/attending
  - src/routes/organizing
  - src/routes/dashboard
  - src/routes/settings/privacy
  - src/lib/server/utils/events.ts
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# RSVP, attendee lists and privacy

## Data

One table, `event_user`, holds both relationships between a user and an event:
`status = 'attending'` (RSVP) and `status = 'organizing'` (creator seat or
accepted co-organizer invite). A user is meant to have at most one row per
event, but the database does not enforce it (tracked as a bug).

## RSVP

`toggleRsvp` (`src/routes/events/[id]/data.remote.ts`): signed-in only. It
refuses events that have already started, deletes the user's `attending` row if
there is one, and inserts one otherwise. The detail page shows an "Organizing"
badge instead of the button for organizers, and hides the button for past
events. The server only checks the date.

The detail page keeps an optimistic `attending` flag and count, and an `$effect`
resyncs them from server data after each revalidation. This `$effect` is
deliberate (see AGENTS.md); a `{#key}` block would cost button focus.

## Attendee counts (two definitions)

- Public pages (home, `/events`, past, detail) count only `attending` rows
  (`listEventsWithAttendeeCount`, detail load).
- Dashboard and `/organizing` use `eventUserCounts`, which counts every row,
  organizers included.

Both are kept on purpose until a decision is made (tracked as a decision issue).

## Privacy

`user.show_attendance` (default true, toggled at `/settings/privacy`) hides a
user's name from public attendee lists. They still count towards the total and
fall into the "and N others" remainder. The detail load shows the first four
names (`ATTENDEE_PEEK_LIMIT`) plus the full visible list in a dialog. The manage
area's Attendees tab shows everyone, with emails, to managers.

## Personal pages

- `/attending`: `attendingEvents(userId)` split into upcoming and past, plus the
  calendar-feed panel.
- `/organizing`: `organizingEvents(userId)`, owned and co-organized events, with
  `isOwner`.
- `/dashboard`: both of the above plus the calendar feed. Sign-in lands here.
