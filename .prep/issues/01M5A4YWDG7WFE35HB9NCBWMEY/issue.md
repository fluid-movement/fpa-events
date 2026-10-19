---
title: 'Lock in the verified defenses: untrusted upstream data'
kind: code
parent: 01M5A45SJ0DTHEX1G0R86JKXEJ
tags:
  - security
---

Lock-in from the untrusted-upstream-data audit (01M5A45SJ0DTHEX1G0R86JKXEJ). These vectors were tried and held. Each entry lists where the defense lives and the test that pins it: an existing one, or the one to add (per AGENTS.md: rules that must hold and bugs we hit, no render-only tests).

## Legacy import (tools/migrate)

1. **Script, event handlers and dangerous markup in legacy event descriptions.** I tried `<script>`, `<img onerror>`, `<svg><script>`, a math/style mutation-XSS, a noscript attribute breakout, `style`/`onclick` attributes, `iframe`, `form`, `meta refresh`, `base`, the comment trick and entity-encoded script. All were stripped or rendered as inert text. The import stores descriptions raw (`migrate.ts:176`), and the defense is sanitize-on-read: `sanitizeRichText` (no attributes at all) runs before every HTML render. That covers the public page (`src/routes/events/[id]/+page.server.ts:67`), the manage view and edit-form seed (`src/routes/events/[id]/admin/event-details.remote.ts:47`), and `stripHtml` → Svelte text for the home page excerpt (`src/routes/+page.svelte:91`) and meta description (`src/lib/utils/meta.ts:34`). `RichContent.svelte` is the only `{@html}` in the app.
   - Existing: `src/lib/utils/html.test.ts` (script dropped, attributes stripped), `src/lib/utils/meta.test.ts:20`.
   - **Add:** an integration test like `schedule.test.ts:191`: insert an event whose stored description carries an `img onerror` payload directly into the DB, then assert it renders inert on `/events/[id]` and on `/events/[id]/admin`. Nothing pins the event-description side today.
2. **Same for legacy schedule descriptions.** Sanitized on read in `src/routes/events/[id]/+page.server.ts:73` and `src/routes/events/[id]/admin/schedule/+page.server.ts:57`. Existing: `tests/integration/schedule.test.ts:191` ("an already-stored malicious description renders inert").
3. **Markup in legacy names, locations, venue names and user names.** These are rendered as Svelte text, which escapes them. The one hand-built HTML sink, the Leaflet popup, escapes name and location (`src/lib/components/EventsMap.svelte:47-49`). Existing: `html.test.ts` escapeHtml cases (tag, both quotes, ampersand). The popup's id interpolation is a gap, filed as 01M5A4X9AP5EG81X6ZCN9Q4JPJ, whose test also pins this entry.
4. **javascript:/data: URLs from legacy data.** The legacy events carry no URL columns. `<a>` in descriptions loses every attribute (`sanitizeRichText`, `allowedAttributes: {}`). `events.picture` is always prefixed with the R2 public URL (`migrate.ts:163`) and rendered as an escaped `src`/`og:image` attribute. Existing: `html.test.ts` "strips attributes". No new test needed.
5. **Legacy content in emails.** None reaches them: the templates in `src/lib/server/email.ts` take only a URL. No test needed.
6. **Legacy names and locations in the calendar feed.** ical-generator escapes CR/LF, `;`, `,` and `\` in SUMMARY and LOCATION, and DESCRIPTION is the app's own URL (`src/routes/api/calendar/[token]/feed.ics/+server.ts:30-37`). Checked against ical-generator 11.1.2. The calendar *name* is the gap, filed as 01M5A4X926P3C442RHMNW5WWJ5, whose unit test also pins SUMMARY/LOCATION escaping.
7. **SQL injection through legacy values.** Every insert in `migrate.ts` is parameterized, and the table names in `WIPE_ORDER` are constants. No test needed (one-off tool).
8. **Credentials.** Legacy bcrypt hashes are carried as-is and verified by `src/lib/server/password.ts` (`$2y$` → `$2b$`). Existing: `src/lib/server/password.test.ts:6,14`. Sessions, verification tokens and calendar tokens are not carried (wiped, and `calendar_token` set to NULL), so no legacy bearer token for those survives. `tools/migrate/.env` is gitignored (`tools/migrate/.gitignore`). The legacy bucket is only read, and `--wipe-target` refuses when target and legacy buckets match (`pictures.ts:76`). Read-only credentials are filed as 01M5A4X9DHFRA3HK0KQB1DY1CF.
9. **Legacy magic links.** Kept with their ids, and expiry is enforced on use (`src/routes/invite/[token]/+page.server.ts:14`). **Add:** an integration test that an expired invite does not grant an organizer seat (none exists; `tests/integration/invite-sign-in.test.ts` covers only the valid path and the off-site redirect).

## fpa-api client (src/lib/server/fpa-api, src/lib/api/*.remote.ts)

10. **Script and unsafe links in player bios (Markdown from fpa-profiles).** `renderMarkdown` (`src/lib/server/markdown.ts`) runs marked then sanitize-html with `http`/`https`/`mailto` only, and forces `target=_blank` and `rel=noopener noreferrer nofollow`. Tried: `javascript:`, mixed-case `JaVaScRiPt:`, entity-encoded `&#106;avascript:`, leading spaces, tab-split `java\tscript:`, `data:text/html`, `vbscript:`, raw `<img onerror>`, and `target`/`rel` overrides. All dropped or overridden. Existing: `src/lib/server/markdown.test.ts:11,17`. **Add** the encoded, mixed-case and `data:` variants to that file.
11. **Bio link URLs.** `toLink` keeps only `http:`/`https:` URLs that parse (`src/lib/results/bio.ts:153-170`). Existing: `src/lib/results/bio.test.ts:70`.
12. **All other upstream fields** (names, divisions, rounds, country, dates, rankings) are rendered as Svelte text. There are no `style`/`src` bindings from API data. Internal links use `resolve()` with a fixed route prefix, so they stay same-origin even for hostile ids. No test needed (Svelte escaping, not our logic).
13. **Cache growth from arbitrary series names.** `resolveSeries` checks the requested series against `/rankings/series` and `/ratings/series` before it is used as a cache key or forwarded (`src/lib/api/rankings.remote.ts:79-89`), so callers cannot grow `rankingIndex.ts`'s per-series cache. **Add** a unit test: an unknown series falls back to the default and makes no upstream call for it.
14. **Hung or slow upstream.** `AbortSignal.timeout(10_000)` covers connecting and reading the body (`client.ts:42`). Existing: `src/lib/server/fpa-api/client.test.ts:68` ("wraps a timeout").
15. **Unbounded paging.** `MAX_PAGES = 10` caps the event-index loop even if `total` lies (`eventIndex.ts:31`). **Add** a case to `eventIndex.test.ts` where `total` stays above what is returned, asserting at most 10 requests.
16. **Outage handling.** Network, timeout, non-2xx and malformed JSON all become `FpaApiError` and are rendered as an unavailable notice. Existing: `client.test.ts:46,58,76`.
17. **Path traversal through page routes.** `/players/%2E%2E` and `/results/%2E%2E` are normalised before routing (verified on a dev server), so the page routes cannot reach other upstream paths. The direct remote-query route can, which is filed as 01M5A4X95046A0WYQ4DMVYQBB3.
18. **Upstream URL exposure.** `FPA_API_URL` is read from `$app/env/private`, and the browser never calls fpa-api. No test needed.

## Open questions
