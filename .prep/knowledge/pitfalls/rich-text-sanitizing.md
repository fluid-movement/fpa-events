---
type: pitfall
title: Rich text is sanitized on read, not on write
description: Stored Tiptap HTML is raw; every load feeding RichContent must sanitizeRichText it.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:46:38Z
scope:
  - src/lib/utils/html.ts
  - src/lib/components/RichContent.svelte
  - src/lib/components/schedule
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Rich text is sanitized on read, not on write

Event and schedule descriptions are Tiptap HTML, stored **as submitted**.
`RichContent.svelte` renders its `content` with `{@html}`, so every load that
feeds it must pass the HTML through `sanitizeRichText` (`src/lib/utils/html.ts`)
first. The whitelist is p, br, strong, em, h2, h3, lists, blockquote, code,
pre and hr, with no attributes.

Where it is done today:

- public event detail: `src/routes/events/[id]/+page.server.ts`
- manage area: `getEvent` in `event-details.remote.ts`, which also stops a
  co-organizer from attacking the owner

Where it is **missing**: schedule item descriptions, rendered through
`ScheduleItemCard` on the public page and in the manage area. This is a stored
XSS (tracked as a critical bug).

When adding a new place that renders stored HTML, sanitize in its load or
query. Better still, sanitize on write as well. AGENTS.md says "on the way in",
which the code does not yet do. Plain-text fields need nothing, because Svelte
escapes them. The one hand-built HTML string (Leaflet popups) uses
`escapeHtml`.
