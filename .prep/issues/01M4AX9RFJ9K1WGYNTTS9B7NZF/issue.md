---
title: Server does not check that an event ends after it starts
kind: code
parent: 01M4B36FVVP2KKQD5SKR78XXQ9
tags:
  - bug
priority: low
---

`eventFormSchema` (`src/lib/server/eventForm.ts`) takes `startDate`/`endDate` as free strings: no format check and no `endDate >= startDate` rule, so a crafted request (or a future form change) can store an event that ends before it starts or an `Invalid Date`. The range picker in the UI prevents it today, but the server is the only real guard. Schedule items already enforce the rule in `scheduleValues`.

The server should reject invalid dates and an end before the start with a field error.

## Open questions
