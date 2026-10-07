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
  - src/routes/events/[id]/admin/schedule
  - src/routes/events/[id]/+page.server.ts
status: stable
confirmed_commit: 56353dfd85d3c3ad78867f49e74e8f12eb070b82
---

# Rich text is sanitized on read, not on write

Event and schedule descriptions are Tiptap HTML, stored **as submitted**.
`RichContent.svelte` renders its `content` with `{@html}`, so every load that
feeds it must pass the HTML through `sanitizeRichText` (`src/lib/utils/html.ts`)
first. The whitelist is p, br, strong, em, h2, h3, lists, blockquote, code,
pre and hr, with no attributes.

Where it is done today:

- event descriptions: on read only, in the public event load
  (`src/routes/events/[id]/+page.server.ts`) and the manage area's `getEvent`
  (`event-details.remote.ts`, which also stops a co-organizer from attacking the
  owner). Create and update store them as submitted.
- schedule descriptions: on write in `scheduleValues` (`schedule.remote.ts`) and
  on read in both loads that return schedule items (public event page, admin
  schedule tab). The read side covers rows stored before the write check, and
  migrated legacy rows. `tests/integration/schedule.test.ts` proves both: a
  stored `<img onerror>` renders inert, and one posted around the editor is
  stored stripped.

When adding a new place that renders stored HTML, sanitize in its load or
query, and sanitize on write too, as AGENTS.md asks ("on the way in"). Plain-text
fields need nothing, because Svelte escapes them. The one hand-built HTML string
(Leaflet popups) uses `escapeHtml`.
