---
title: Schedule tab hangs on a slow Photon geocoding call
kind: code
parent: 01M4B36FRZAFY84XJ5C31KJCV8
tags:
  - bug
priority: high
---

The admin Schedule tab's server load (`src/routes/events/[id]/admin/schedule/+page.server.ts`) geocodes the event's free-text location through Photon whenever the event has no `event_location`, to centre the venue picker's map. `autocomplete` (`src/lib/geocoding.ts`) calls Photon with no timeout, so a slow Photon response blocks the whole tab; navigation only completes when the load does. It surfaced as `event-manage.test.ts` "switching tabs leaves edit mode" failing in the pre-push hook on 2026-10-07 (URL still on /edit after 5 s), after passing minutes earlier.

The fallback is a convenience: the load must give up on it after a short bound and render without a map centre, rather than wait on an external service.

## Open questions
