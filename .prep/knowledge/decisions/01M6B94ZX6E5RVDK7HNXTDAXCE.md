---
type: decision
title: Legacy location mappings are committed in tools/migrate/data, not left in the container
description: 'The dry run of 2026-11-01 geocoded ''online Teams call'' to Lynchburg, US, which would put a false map pin on an online event. The owner-reviewed mappings are committed in event-locations.json because the container''s copy is ephemeral: ''online Teams call'' is null (no pin), ''Berlin - Templehoferfeld'' maps to the city-level Berlin coordinates, since the importer dedupes on (city, country) and first seen wins, so a different Berlin coordinate would collide with the other Berlin events. Poznań and Zandvoort keep the geocoded values. Decided with the owner on 2026-11-01.'
date: "2026-11-01"
scope:
  - tools/migrate/data/event-locations.json
---


