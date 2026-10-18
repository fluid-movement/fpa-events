---
title: Switch events.freestyledisc.org to the new app
kind: manual
parent: 01M4B48HBQAD5X06ECPSJVFGG6
depends_on:
  - 01M4B48HHPX6ACYDHQV887AGTE
tags:
  - cutover
priority: high
---

Source: tools/migrate/README.md "Cutover runbook".

Point the domain at the new app in Coolify once the smoke test passes and every other Go Live area is resolved, with `BETTER_AUTH_URL` and the request origin matching the public domain. Sessions are not migrated, so users sign in again with their existing passwords. The Laravel app stays reachable (read-only, not deleted) until the new site is confirmed working.

Decided 2026-10-18: put the Laravel app in maintenance mode before the final dump, so nothing new lands in it; take it out of maintenance only read-only after the switch.

## Open questions
