---
title: Anonymous fpa-api remote queries are unthrottled and uncached, so one client can drive unbounded upstream traffic
kind: code
parent: 01M5A45SRVRT71JY7RKBHSZBWE
tags:
  - security
priority: low
---

Found by the data-exposure and abuse audit (01M5A45SRVRT71JY7RKBHSZBWE), 2026-10-19.

## Vulnerability

Nothing outside Better Auth is rate limited, and three public, unauthenticated remote queries each cost one uncached upstream fetch to fpa-api per call:

- `getPlayerProfile` — `src/lib/api/players.remote.ts` line 44 (`GET /players/{id}`)
- `getEventResults` — `src/lib/api/results.remote.ts` line 86 (`GET /events/{id}`)
- `getScoringResults` — `src/lib/api/rankings.remote.ts` line 175 (`GET /players/{id}`, plus the cached standings)

Remote queries are plain GETs (`/_app/remote/<id>/<name>?payload=...`), allowed from any origin and needing no session. A single client can therefore drive an unbounded stream of fpa-api requests through our server, each held open for up to 10 s (`TIMEOUT_MS` in `src/lib/server/fpa-api/client.ts`), with arbitrary ids so no upstream cache helps. The standings and the event index are cached in-process; these three are not.

The other unthrottled writes were checked and are bounded or gated: `createEvent` and `updateEvent` require a Turnstile token per submit; `toggleRsvp` can only flip the caller's one row per event and sends nothing; schedule, venue and magic-link writes need a manager. Uploads are filed separately.

## How to reproduce

Call the `getPlayerProfile` remote query repeatedly with varying ids, anonymously: every call reaches fpa-api.

## Severity

Low: availability of fpa-api and of the app's outbound sockets; no data exposure. There may be a limit at the proxy (Traefik/Coolify) — that belongs to the deployment audit and was not checked here.

Blocks go-live: no.

## Fix direction

Cache profile and event-detail responses briefly in-process (fpa-api refreshes hourly, as `rankings.remote.ts` notes), and/or put a coarse per-IP limit on remote-query traffic in `handle` or at the proxy.

## Open questions
