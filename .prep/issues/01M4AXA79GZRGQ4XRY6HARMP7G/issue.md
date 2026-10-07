---
title: City map on the event detail page
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - feature
  - maps
priority: low
---

Source: docs/todo.md, "Geolocation Next Steps".

The home page shows upcoming events on a Leaflet map, but the event detail page has no map, though `event_locations` holds a city-level position for most events. The detail page should show a small map pinned at the event's city (and, where schedule venues have coordinates, their pins), using the `$lib/leaflet` helpers, and render nothing when no position is known.

## Open questions

- Should venue pins from the schedule appear on the same map, or only the city?
