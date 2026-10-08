---
title: Account deletion leaves event pictures behind and removes co-organized events
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - privacy
  - r2
priority: low
---

Source: project sweep, 2026-10-08.

`deleteAccount` (`src/routes/settings/account/data.remote.ts`) deletes the user's events with a bare `db.delete(events)`, unlike `deleteEvent`, which calls `releasePicture`. The deleted events' images stay in the public R2 bucket, which the parity table and a GDPR erasure request both assume are gone. It also removes events that have co-organizers, so they lose an event they are still running without notice. Decide whether ownership passes to a co-organizer, and release the pictures of whatever is deleted.

## Open questions
