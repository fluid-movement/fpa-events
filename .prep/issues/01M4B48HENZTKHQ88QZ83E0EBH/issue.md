---
title: Run the final legacy data migration
kind: manual
parent: 01M4B48HBQAD5X06ECPSJVFGG6
tags:
  - cutover
priority: high
---

Source: tools/migrate/README.md "Cutover runbook"; retired docs/todo.md "Migration Prep".

Ahead of time: deploy the latest app, run `npm run migrate:pictures` so the bulk of the R2 copy is done, and run `npm run geocode` locally against a fresh legacy dump, reviewing and committing `data/event-locations.json`. At cutover, in the app container's Coolify terminal: `npm run migrate -- --dry-run`, check the report, `npm run migrate`, then `npm run migrate:pictures` for stragglers. The report must show every legacy user, event, RSVP, magic link and schedule accounted for, with location warnings understood.

## Open questions
