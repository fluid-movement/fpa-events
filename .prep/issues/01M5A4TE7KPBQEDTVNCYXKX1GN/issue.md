---
title: Anonymous calls to manager remote functions are 500s and GlitchTip reports instead of 401s
kind: code
parent: 01M5A34Y0620NBQFRA09MKZWNN
tags:
  - security
priority: low
---

## Requirement

Found by the authorization audit (01M5A34Y0620NBQFRA09MKZWNN).

**Problem.** `requireEventManager` / `requireEventOwner` (`src/lib/server/authz.ts`, `requireEventAccess` at line 97) start with `requireUser()`, which on a missing session throws a bare `Error('Unauthorized')` (line 19). The doc comment above `requireEventAccess` says it throws 401, and explains that a bare throw from a remote function reaches the client as a 500 — which is exactly what the anonymous case does. Every manager remote function is affected: `getEvent`, `updateEvent`, `deleteEvent`, `generateLink`, `regenerateLink`, `listEventLocations`, `createEventLocation`, `deleteEventLocation`, `addSchedule`, `updateSchedule`, `deleteSchedule`.

The request is still refused and nothing is written, so this is not an access bypass. The harm is that each anonymous call is treated as an unexpected server error: `handleError` logs it with a fresh error reference and sends it to GlitchTip. Anyone can generate unlimited error reports (and alert noise) with unauthenticated GETs to a manager query, and a real 500 among them is harder to see.

**Reproduce (dev server, no cookies).** `GET /_app/remote/<hash>/getEvent?payload=<base64url of ["<any id>"]>` answers `{"type":"error","error":{"status":500,"message":"Internal Error","errorId":"…"}}`, and the server log prints `[server error] ref=… | user=anonymous | Error: Unauthorized`. Tried on 2026-10-19.

**Severity:** low. **Blocks go-live:** no, but it is cheap and keeps GlitchTip usable on launch day.

## Acceptance

See criteria.

## Open questions
