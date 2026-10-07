---
type: feature
title: Rankings, results and player pages
description: The /rankings, /results and /players views, their remote queries, and the outage-as-data rule.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:47:15Z
scope:
  - src/lib/api/rankings.remote.ts
  - src/lib/api/results.remote.ts
  - src/lib/api/players.remote.ts
  - src/lib/rankings
  - src/lib/results
  - src/lib/components/rankings
  - src/lib/components/results
  - src/routes/rankings
  - src/routes/results
  - src/routes/players
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Rankings, results and player pages

Read-only views over fpa-api (see `/components/fpa-api.md`). They need no
sign-in and no database.

## Pages

| Route                                                    | Panel component                        | Remote queries (`src/lib/api/`)                                                |
| -------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| `/rankings` (`?tab=ratings`, `?series=`, `?minMatches=`) | `RankingsPanel`, `RatingsPanel`        | `getSeries`, `getRankings`, `getRatings`, `getScoringResults` (row drill-down) |
| `/results` (`?q=`, `?division=`, `?year=`, `?page=`)     | `ResultsPanel`, `ResultsFilters`       | `getResultEvents`                                                              |
| `/results/[eventId]`                                     | `EventResultsPanel`, `DivisionResults` | `getEventResults`                                                              |
| `/players/[playerId]`                                    | `PlayerProfilePanel`, `PlayerCareer`   | `getPlayerProfile` (accepts alias ids and returns the canonical one)           |

Defaults: ranking series `ranking-open`, rating series `rating-open`, minimum
match count 50 (`#lib/rankings/types`), and 50 results per page
(`#lib/results/types`). Unknown series fall back to the default. Out-of-range
pages are clamped, not 404'd. The API caps lists at 500 rows, so the UI compares
`rows.length` with `total`.

## Design rules

- **Outages are data, not errors.** Each query wraps its fetch in `attempt()`
  and returns `ApiResult<T>` (`{ ok: true, data } | { ok: false, message }`).
  The panels render `ServiceUnavailable` on `ok: false`. A throw during SSR
  would 500 the whole request before any `<svelte:boundary>` saw it.
- **No `pending` boundary.** The panels `await` their query directly
  (Svelte async), so the server renders the standings into the HTML for search
  engines and no-JS visitors. A `pending` snippet would defer to the client.
- `.remote.ts` files may only export remote functions, so shared constants and
  types live in `#lib/rankings/types` and `#lib/results/types`.
- Pure transforms are unit-tested: `joinScoringResults`
  (`#lib/rankings/breakdown`), `collapsePlacements` (`#lib/results/career`),
  `RankingsTable`/`DivisionResults` filtering.

Integration specs (`rankings.test.ts`, `results.test.ts`) run against the real
API and assert behaviour, not specific players.

Our events and fpa-api's events are separate datasets with separate ids. There
is no link between an FPA Events event and its results.
