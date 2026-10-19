---
title: 'Malformed form fields and expected failures are 500s: picture size, schedule dates, venue ids, captcha, multipart'
kind: code
parent: 01M5A34YEEF5NVYZ4FXY7C25A9
tags:
  - security
priority: low
---

Finding from the input and output handling audit (01M5A34YEEF5NVYZ4FXY7C25A9).

**Vulnerability.** Several forms parse hidden or free-text fields without validating them. Several expected failures are thrown as a bare `Error`, so a signed-in user's bad input becomes a 500 with a GlitchTip report, and the user sees "Internal Error" instead of a message. Each case below was checked against Postgres or the code:

- `pictureWidth` / `pictureHeight` (`src/lib/server/eventForm.ts:105-106`, schema lines 41-42 are `v.optional(v.string())`). Non-numeric input becomes `NaN` and is rejected by the integer column (`22P02`). A value over 2^31 is out of range (`22003`). Either way the result is a 500 on createEvent / updateEvent.
- Schedule start/end (`src/routes/events/[id]/admin/schedule/schedule.remote.ts:12-17, 28-31`). These are any non-empty string. An unparseable date gives an Invalid Date, `endDate <= startDate` is false for NaN, and the insert throws `RangeError: Invalid time value`. The genuine "end before start" case is `throw new Error(...)` (line 31), also a 500.
- `locationId` (`schedule.remote.ts:33`). `parseInt` of junk is `NaN`, which reaches an integer comparison: 500.
- `deleteEventLocation` id (`src/routes/events/[id]/admin/schedule/locations.remote.ts:59`). `v.transform(Number)` gives `NaN`: 500.
- Captcha failure (`src/lib/server/turnstile.ts:37`, `requireTurnstile`). A failed or expired Turnstile token on createEvent / updateEvent is `throw new Error('Captcha verification failed')`: a 500 and a GlitchTip report for an ordinary user or bot outcome.
- Malformed multipart body on `POST /api/events/upload-image` (`+server.ts:16`). `request.formData()` throws `TypeError: Failed to parse body as FormData`, which is uncaught: 500.
- A NUL byte in any form string (name, location, description, ...) fails the insert: 500. The anonymous, path-side cases are 01M5A5KMSNKYDQ613E8D06KDSS.

**Reproduce.** As a signed-in organizer, submit the create or schedule form with a hidden field changed (for example `pictureWidth=abc`, or a schedule `startDate=x`). I did not drive these over HTTP: seeded users cannot sign in and the audit creates no accounts. The Postgres behavior was confirmed with read-only `SELECT $1::integer` / `::real` / text-with-NUL casts on the dev DB, and the Invalid Date path was confirmed through `/events/past/1e20`, which fails the same way.

**Severity:** low (signed-in only; noisy error tracking and confusing errors; no data exposure). **Blocks go-live:** no.

## Open questions
