---
title: Schedule edit/delete and venue delete are not scoped to the authorised event
kind: code
parent: 01M4B36FRZAFY84XJ5C31KJCV8
tags:
  - bug
  - security
priority: high
---

`updateSchedule`, `deleteSchedule` (`schedule.remote.ts`) and `deleteEventLocation` (`locations.remote.ts`) run `requireEventManager(data.eventId)` and then update/delete by row id alone. Both ids come from the form, so a user who manages any event (anyone can create one) can pass their own `eventId` with another event's schedule or venue id and edit or delete it. `addSchedule`/`updateSchedule` likewise accept a `locationId` belonging to another event's venue.

Each write must be restricted to rows whose `event_id` matches the event the user was authorised for (and the venue must belong to the same event), with an integration or unit test showing a cross-event id is rejected.

## Open questions
