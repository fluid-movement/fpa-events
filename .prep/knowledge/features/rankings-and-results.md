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
| `/players/[playerId]`                                    | `PlayerProfilePanel`, `PlayerCareer`, `PlayerBio` | `getPlayerProfile` (accepts alias ids and returns the canonical one)           |

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

## Player profile enrichment

`GET /players/{id}` may carry `profile: { fields, updatedAt }`, which is historic data
from the old FPA site edited in fpa-profiles. Most players have none. The query
turns it into `PlayerProfileView.bio` with `toPlayerBio` (`#lib/results/bio`), which
is the only reader of the raw value:

- Fields are kept by **value shape**, not by key, because new keys arrive without an
  API release: a string becomes text, a list of strings becomes names, and a list of
  objects becomes links (http(s) only, labelled by host when there is no label).
  Anything else is dropped. When nothing usable is left, the result is `null`.
- Free text made only of several short lines without punctuation is read as names,
  because mentors and partners are stored one per line.
- `bio` is Markdown. It is rendered on the server by `renderMarkdown`
  (`#lib/server/markdown`: `marked`, then `sanitize-html`, with headings demoted
  to h3/h4 and links opened externally), so the parser never ships to the browser.
- The query wraps the whole conversion in a try/catch, so bad enrichment costs only
  the enrichment, never the page.
- In the page, `nickname`, `headline` and `playingSince` go into the page header,
  and everything else goes into an "About" section between "Current standing" and
  "Results". The section is absent when there is nothing to show in it.

Integration specs (`rankings.test.ts`, `results.test.ts`) run against the real
API and assert behaviour, not specific players.

Our events and fpa-api's events are separate datasets with separate ids. There
is no link between an FPA Events event and its results.
