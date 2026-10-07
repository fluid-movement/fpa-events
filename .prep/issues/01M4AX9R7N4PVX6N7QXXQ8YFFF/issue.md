---
title: Event picture field is client-controlled and can delete other events' images
kind: code
parent: 01M4B36FVVP2KKQD5SKR78XXQ9
tags:
  - bug
  - security
priority: high
---

`eventFormSchema.picture` is an arbitrary string from the form (`src/lib/server/eventForm.ts`), stored as-is by create/update. On update, `updateEvent` calls `deleteImage(existing.picture)` whenever the picture changes, and on delete `deleteEvent` does the same; `deleteImage` (`src/lib/server/r2.ts`) strips `R2_PUBLIC_URL` and deletes that key. So an organizer can set their event's picture to another event's R2 URL, then change it again, and the server deletes the other event's image. It also lets any URL be stored as an event picture.

The server should only accept picture values that are our own upload URLs (under `R2_PUBLIC_URL/events/`, plus `R2_PUBLIC_URL/pictures/` for images migrated from Laravel — see /features/legacy-migration.md), and must not delete an object another event still references. Consider also whether `image/svg+xml` uploads should be refused by `src/routes/api/events/upload-image/+server.ts`.

## Open questions
