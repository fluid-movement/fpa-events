---
title: Stored XSS through schedule item descriptions
kind: code
parent: 01M4B36FRZAFY84XJ5C31KJCV8
tags:
  - bug
  - security
priority: critical
---

Schedule item descriptions are written by the Tiptap editor (`ScheduleItemForm.svelte`) and rendered through `RichContent` (`{@html}`) in `ScheduleItemCard.svelte`, but unlike event descriptions they are never passed through `sanitizeRichText`. Neither `addSchedule`/`updateSchedule` (`src/routes/events/[id]/admin/schedule/schedule.remote.ts`) nor the loads that read them (`src/routes/events/[id]/+page.server.ts`, `.../admin/schedule/+page.server.ts`) sanitize. Any signed-in user can create an event, so anyone can post a schedule item whose description contains e.g. `<img src=x onerror=...>` and have it execute for every visitor of the public event page.

Schedule descriptions must be sanitized with the same whitelist as event descriptions wherever they are rendered as HTML, and a test should prove a script-bearing description comes out inert.

## Open questions
