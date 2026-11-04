---
title: Events hosted by a crew
kind: code
parent: 01M5EVT0B4G7G7V5AA15ZC5BWP
depends_on:
  - 01M6KPQ5HC3RNE2QR5PFHRJ00X
---

Events created by a crew member carry the crew: events.crew_id nullable (set null on crew delete), set at creation when the organizer is in a crew. A per-event toggle 'Show hosted by crew' (events.show_crew, default on) controls whether the event page and cards show a crew badge linking to the crew page; changeable later in event settings. Event and crew pages stay consistent with the shared event query helpers. Seed updated.

## Open questions
