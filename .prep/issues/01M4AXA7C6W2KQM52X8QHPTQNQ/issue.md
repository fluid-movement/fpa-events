---
title: Decide how 'N attending' is counted
kind: decision
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - attendance
priority: low
---

Source: TODO.md, "Cleanup pass — 2026-09".

The public browse and detail pages count only `event_user` rows with status `attending`; the dashboard and organizing pages (`eventUserCounts` in `src/lib/server/utils/events.ts`) count every row, organizers included. The same event can therefore show two different numbers. Decide which number each page shows and what it is labelled.

## Open questions
