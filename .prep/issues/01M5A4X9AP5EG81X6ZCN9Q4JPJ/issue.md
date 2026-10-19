---
title: Map popup interpolates the event id unescaped; the import does not validate id format
kind: code
parent: 01M5A45SJ0DTHEX1G0R86JKXEJ
tags:
  - security
priority: low
---

Finding from the untrusted-upstream-data audit (01M5A45SJ0DTHEX1G0R86JKXEJ).

**Vulnerability.** The events map builds its Leaflet popup as an HTML string (`src/lib/components/EventsMap.svelte:40-55`). Name and location go through `escapeHtml`, but the link is `href="${resolve('/events/[id]', { id: ev.id })}"`, and Kit's `resolve` inserts string params verbatim (`node_modules/@sveltejs/kit/src/utils/routing.js:330-335`, no encoding). An event id containing `"` or `<` would break out of the attribute. App-created ids are ULIDs. Legacy ids are copied by the import without any format check (`tools/migrate/src/migrate.ts:165-169`, and likewise for users, schedules and magic links), so the import is the one path by which a non-ULID id could reach this sink.

**Reproduce.** Not reproducible with real data: Laravel's `HasUlids` generated the legacy ids, so they are ULIDs too. Construct it by giving an event in a scratch DB an id containing a double quote and opening the events map popup for it.

**Severity.** Low (defense in depth: the one hand-built HTML sink AGENTS.md names has one unescaped interpolation, guarded today only by the id format).

**Blocks go-live?** No.

## Open questions
