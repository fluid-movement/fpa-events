---
title: fpa-api ids pass dot segments through to upstream paths
kind: code
parent: 01M5A45SJ0DTHEX1G0R86JKXEJ
tags:
  - security
priority: low
---

Finding from the untrusted-upstream-data audit (01M5A45SJ0DTHEX1G0R86JKXEJ).

**Vulnerability.** Player and event ids from the browser are interpolated into fpa-api paths with only `encodeURIComponent`, which leaves `.` and `..` intact; the URL parser then resolves them as dot segments. So a public, unauthenticated call with id `..` makes the server fetch fpa-api's root (`/`), and `.` fetches the collection endpoints (`/players/`, `/events/`) instead of a single record.

- `src/lib/api/players.remote.ts:47-50` (`getPlayerProfile`, `v.string()`)
- `src/lib/api/results.remote.ts:96-99` (`getEventResults`, `v.string()`)
- `src/lib/api/rankings.remote.ts` `getScoringResults` (`playerId: v.string()`)

Also, every `FpaApiError` message, which includes the upstream path and status, is returned to the browser as `{ ok: false, message }` (`attempt()` in each of the three files).

**Reproduce.** Verified against a dev server: calling the `getPlayerProfile` remote query directly with the argument `..` returned "Rankings API returned a malformed response for /players/..", meaning the server fetched the upstream root. The page routes are not affected: `/players/%2E%2E` is normalised before routing.

**Severity.** Low. Only one level of traversal is possible (`/` is encoded), the requests are GETs to the same first-party host the app already trusts, and the response is discarded or fails safe. It is an unvalidated-input gap rather than an exploitable SSRF.

**Blocks go-live?** No.

## Open questions
