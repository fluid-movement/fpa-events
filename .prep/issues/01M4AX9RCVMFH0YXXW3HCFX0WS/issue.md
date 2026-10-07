---
title: event_user allows duplicate rows per user and event
kind: code
parent: 01M4B36G18PC3XQAFK926SJRK7
tags:
  - bug
---

`event_user` (`src/lib/server/db/schema.ts`) has no unique constraint on `(event_id, user_id)`. `toggleRsvp` (`src/routes/events/[id]/data.remote.ts`) looks only for an `attending` row, so a co-organizer who submits the RSVP form (the UI hides it, the server does not refuse it) gets a second `attending` row, and a double submit can race into two `attending` rows. Duplicates inflate counts and make the invite flow's `existing` lookup pick an arbitrary row.

One row per user and event should be enforced by the database, with `toggleRsvp` refusing or ignoring organizers. Migration must clean existing duplicates first; the seed and `tools/migrate` must still load.

## Open questions
