---
title: Event descriptions are stored raw; only the render sites sanitize them
kind: code
parent: 01M5A34YEEF5NVYZ4FXY7C25A9
tags:
  - security
priority: low
---

Finding from the input and output handling audit (01M5A34YEEF5NVYZ4FXY7C25A9).

**Problem.** Event descriptions are written to the database exactly as submitted, and are made safe only where they are rendered:
- `createEvent` (`src/routes/events/create/data.remote.ts:23`) and `updateEvent` (`src/routes/events/[id]/admin/event-details.remote.ts:70`) store `data.description` raw.
- Schedule descriptions are sanitized on write (`schedule.remote.ts:48-49`, "never store raw markup") and again on read.

Every current HTML sink sanitizes on read (`events/[id]/+page.server.ts:67`, `event-details.remote.ts:47`), and the excerpt and meta paths go through `stripHtml` into Svelte text. I tried 20 hostile variants against `sanitizeRichText` and `stripHtml`, and all came out inert (see the lock-in issue). So **no XSS exists today**.

The gap is defence in depth:
- the raw markup is shipped to the browser in page data by every listing that selects all event columns (`listEventsWithAttendeeCount` in `src/lib/server/utils/events.ts:38`, used by the home page, events list, archive, dashboard, organizing and attending);
- any future `{@html}` of `event.description` on one of those pages, or a new consumer (an email, an export), would be a stored XSS reachable by any signed-in user;
- the two description fields follow opposite rules, which is how such a slip happens.

**Severity:** low (hardening; no exploitable path today). **Blocks go-live:** no.

## Open questions
