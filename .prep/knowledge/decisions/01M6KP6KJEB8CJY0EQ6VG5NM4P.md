---
type: decision
title: Cities are canonical shared markers
description: 'event_locations becomes cities: one row per (country, city), found by identity and reused, first marker wins and is never moved. Events and crews both reference it. Crews are unique per city, may change city, and there is no contention flow. Reason: crew pages list every event in the city, which needs a single row per city.'
date: "2026-11-04"
scope:
  - src/lib/server/db/**
---


