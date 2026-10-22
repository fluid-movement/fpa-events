---
type: decision
title: Shared event locations are matched on city, country and coordinates
description: findOrCreateEventLocation reuses an event_locations row only when city, country and both coordinates (within 0.0001 degrees) match, and never moves an existing row. Chosen 2026-10-22 over server-side geocoding because it needs no network call or schema change; the cost is that one city can have several rows and map markers.
date: "2026-10-22"
issue: 01M5A5KMWTND0PSAJJM265KNKD
scope:
  - src/lib/server/db/eventLocations.ts
---


