---
type: decision
title: fpa-api ids are accepted only as UUIDs
description: Player and event ids sent to fpa-api must be UUIDs (fpaId in src/lib/server/validation.ts), matching the live API; anything else is a 400 before a path is built, so a malformed /players or /results URL shows the error page instead of the unavailable notice. Chosen 2026-10-22 as the strictest check that fits the live data.
date: "2026-10-22"
issue: 01M5A4X95046A0WYQ4DMVYQBB3
scope:
  - src/lib/api/**
---


