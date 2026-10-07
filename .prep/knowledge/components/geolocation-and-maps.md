---
type: component
title: Geolocation and maps
description: Photon geocoding, event vs venue location tables, and the Leaflet helpers.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:46:38Z
scope:
  - src/lib/geocoding.ts
  - src/lib/leaflet.ts
  - src/lib/server/db/eventLocations.ts
  - src/lib/components/EventsMap.svelte
  - src/lib/components/GeocodingCombobox.svelte
  - src/lib/components/EventLocationInput.svelte
  - src/lib/components/VenueLocationPicker.svelte
status: stable
confirmed_commit: a09e452c2f58ce526aa8105722c102c7bb8bc640
---

# Geolocation and maps

## Geocoding

`src/lib/geocoding.ts` wraps Photon (`photon.komoot.io`, OSM, free, no key).
`autocomplete(query, limit)` returns `GeocodingResult`s (display name, city,
country, lat/lng). It is called **from the browser** by `GeocodingCombobox`,
and once server-side by the admin schedule load as a fallback. There is no
caching and no rate limiting on our side.

`autocomplete` takes an optional `AbortSignal`. Server code must pass one: a
load that awaits Photon without a bound blocks navigation for as long as Photon
is slow. The schedule load gives up after 2 s (`GEOCODE_TIMEOUT_MS`) and renders
without a map centre; that hang once failed the pre-push suite.

- `EventLocationInput`: city-level typeahead on the event form. Picking a
  suggestion fills hidden `city/country/latitude/longitude` fields.
- `VenueLocationPicker`: venue typeahead plus a draggable Leaflet pin.

## Two location tables

- `event_locations`: global and city-level, shared by events, deduplicated by
  `(city, country)` in `findOrCreateEventLocation`
  (`src/lib/server/db/eventLocations.ts`). The first insert's coordinates win.
  `events.location` keeps the free display text alongside.
- `schedule_locations`: per-event venues with optional precise coordinates.

For legacy events, `event_locations` was filled by `tools/migrate`'s geocode
step (`data/event-locations.json`).

## Leaflet

Never import `leaflet` statically, because it touches `window` and breaks SSR.
Use `#lib/leaflet`: `loadLeaflet()` (dynamic import + CSS), `addOsmTiles()`,
and `enableTwoFingerPan()`, which keeps one-finger page scroll on touch
devices. Leaflet controls sit below the sheet/sidebar z-index (1100).
Popup HTML is built by hand, so values go through `escapeHtml`.

Maps today: the home page (`EventsMap`, upcoming events with a location) and the
venue picker. The event detail page has no map yet (tracked as a feature).
