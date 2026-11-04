---
type: decision
title: 'Events hosted by a crew: admin-only attachment, show_crew toggle'
description: 'Only crew admins attach an event to their crew (events.crew_id set at creation, never reassigned by edits); events.show_crew (default true) only controls whether the badge is shown. Reason: members have no editing rights on a crew, and hiding a badge must not lose the host link.'
date: "2026-11-04"
scope:
  - src/lib/server/utils/events.ts
---


