---
title: Smoke-test the migrated data on the deployed app
kind: manual
parent: 01M4B48HBQAD5X06ECPSJVFGG6
depends_on:
  - 01M4B48HENZTKHQ88QZ83E0EBH
tags:
  - cutover
priority: high
---

Source: retired docs/todo.md "Migration Prep"; tools/migrate/README.md "Testing locally".

After the final migration, walk through the deployed app with real data before the domain moves: sign in with a legacy account's existing password (exercises the bcrypt path), browse upcoming and past events, open events with pictures and check the images load from the new bucket, check migrated rich-text descriptions render correctly, check the home map and schedules with and without venue coordinates, RSVP, and edit an event as its organizer. Anything broken is filed as a Go Live issue.

## Open questions
