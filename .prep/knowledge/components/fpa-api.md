---
type: component
title: fpa-api client
description: Server-only client for the rankings/results service, FpaApiError, and the in-memory event and ranking caches.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:47:15Z
scope:
  - src/lib/server/fpa-api
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# fpa-api client

fpa-api is a separate, read-only service (production:
`https://fpa-api.fluid-movement.de`) that serves rankings, ratings, players and
competition results from the freestyle judging data. It keeps an in-memory index
and refreshes it hourly. It answers 503 with `Retry-After` while warming up.
Its own integration notes live in the fpa-api repo (`docs/INTEGRATION.md`).

## Client (`src/lib/server/fpa-api/client.ts`)

`fpaApiGet<T>(path)`: a server-only GET of `FPA_API_URL + path`, with a 10 s
timeout. Every failure (missing `FPA_API_URL`, network/DNS/timeout, non-2xx,
bad JSON) becomes an `FpaApiError` (with `status` when there is one). Callers
catch exactly that type and let anything else surface as a bug. The browser
never calls fpa-api, so there is no CORS setup and no public URL. Response
shapes are in `types.ts`.

## Caches (process memory, 5-minute TTL, in-flight de-duplication)

- `eventIndex.ts` `loadEventIndex()`: pages `GET /events` (limit 500, at most 10
  pages, ~900 events, ~244 KB) into `IndexedEvent`s. Each gets a normalised
  `dateKey`/`year` (via `apiDateKey` in `#lib/utils/dates`) and a lowercased
  `searchName`. `filterEvents` and `facetsOf` do search, division and year
  filtering locally, because the API compares dates as strings and some
  upstream dates are not zero-padded (`2020-2-8`). Never sort or filter on raw
  upstream `startDate`.
- `rankingIndex.ts` `loadRankingStandings(series)`: one cached response per
  series, shared by the standings table and the per-player breakdown. A failed
  refresh keeps the previous good entry.

The `reset*` exports are test seams. The caches are per Node process and reset
on deploy.

Unit tests: `client.test.ts`, `eventIndex.test.ts`, `rankingIndex.test.ts`.
