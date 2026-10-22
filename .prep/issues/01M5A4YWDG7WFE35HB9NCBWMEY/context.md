Tests only; no app code changes.
- Event description inert: new integration spec tests/integration/event-description.test.ts. Insert event with img-onerror description via sql() (helpers/db.ts), assert inert on `/events/[id]` (sanitized in +page.server.ts) and `/events/[id]/admin` (event-details.remote.ts getEvent, rendered by EventDetailsView/RichContent). Model: schedule.test.ts "already-stored malicious description renders inert".
- Expired invite: already covered by tests/integration/organizing.test.ts ("an already expired link has no acceptance form", "a link expired after GET cannot be accepted"); verify by mutation, do not duplicate.
- markdown.test.ts: add mixed-case, entity-encoded, tab-split, data:, vbscript: link cases.
- getRankings/getScoringResults/getRatings unknown series: new src/lib/api/rankings.remote.test.ts, mocking `$app/server` `query` as passthrough and spying on fetch; `resolveSeries` in src/lib/api/rankings.remote.ts. Reset rankingIndex cache with resetRankingCache.
- eventIndex.test.ts: total never reached -> exactly MAX_PAGES (10) fetches.
- Mutation-check each defense; revert.
