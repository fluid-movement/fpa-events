---
title: Crew listing with map, and details page with city events
kind: code
parent: 01M5EVT0B4G7G7V5AA15ZC5BWP
depends_on:
  - 01M6KP6JPAT43YSZ3K8MTVJD9K
---

Public crew listing with a Leaflet map showing where crews are (reuse #lib/leaflet and the EventsMap approach) plus a list with links to details pages. Details page shows the crew, picture and body text, the member list, and ALL upcoming and historic events in the crew's city via events.city_id = crew.city_id (split at now; there are no private events). Use the shared event helpers in #lib/server/utils/events, never per-event counts. The details page should look distinct from an event page. Empty state on the listing/city: invite people to start the crew for their city.

## Open questions
