# todo: lock in the verified input/output defenses

Branch `cloud/lockin-io`. Tracking issue (prep, local only): `01M5A5PQ1D4BA5BF2TCJQTRV91`.
This file is the whole hand-off. Delete nothing in it; tick boxes and fill in
the Status section as you go. The orchestrator removes this file before merging.

## Rules

- Read `AGENTS.md` first and follow it exactly — especially **Testing** (when to
  write a test; integration conventions: `waitForLoadState('networkidle')` after
  `goto` and after submits, `expect.poll` for DB state, `expectConsoleErrors(page)`
  for deliberate 4xx, `signUpAndSignIn()` for destructive identity tests,
  `data-testid` selectors). SvelteKit 3 / Svelte 5, `#lib` imports, never `$lib`.
- **Do not touch `.prep/`** and do not run the `prep` CLI. The orchestrator owns the records.
- This is a test-only change. Do not change application code. If a test shows a
  defense below does NOT hold, stop, write it under "Status → Blocked" and leave the test failing-but-skipped with a comment.
- Every new test must fail when its defense is removed: mutation-check each one
  (temporarily break the defense, run the test, see it fail, revert) and record
  the mutation under Status. `git diff` must show only test files (and cloud-todo.md) at the end.
- Do not add or upgrade dependencies.
- Checks before you finish: `npm ci`, `npm run check` (0 errors, 0 warnings),
  `npx vp test run`, `npx eslint <changed files>`, `npx prettier --check <changed files>`.
- Integration specs need Postgres and Chromium (`createdb fpa_events_test && npm run db:reset:test`,
  `npx playwright install chromium`, then `npm run test:integration -- <spec>`; see AGENTS.md
  "Integration tests use their own database"). If the environment cannot provide them,
  write the specs carefully anyway, mirroring existing specs and helpers, and list them
  under "Status → Integration specs not run" — the orchestrator runs them locally.
- Commit in small steps on this branch with `git commit --no-verify` (the hooks need a local DB),
  end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`,
  and push this branch only (`git push --no-verify origin cloud/lockin-io`). Never push `main`.

## Notes since the audit (code moved on; check before relying on line numbers)

- Malformed ids/tokens are now rejected in the loads (`storedIdParam`, `isCalendarToken` in
  `src/lib/server/validation.ts`); a NUL in the path is 400 in `handle` (`rejectNulPath`).
  So a NUL byte can no longer trigger a 500 — criterion 4 must drive the 500 differently
  (e.g. a unit test of `handleError` with a mocked failure plus an integration check through a
  route whose DB call fails), or explain why an existing test already covers it.
- `/invite/<token>` GET now shows a confirmation page; redemption is a POST via the remote form
  in `src/routes/invite/[token]/data.remote.ts`. Unknown tokens should still be 404.
- Upload endpoint now sniffs magic bytes (`src/lib/server/image-type.ts`); avatar `image` is dropped
  by a Better Auth hook (`src/lib/server/userInput.ts`). These were "filed elsewhere" in the audit and are done.
- Security headers live in `src/hooks.server.ts` (`withSecurityHeaders`); CSP config in `svelte-options.js`.

## Acceptance criteria (from the issue)

- [ ] 1. Integration: a page response and the calendar-feed response carry `referrer-policy: strict-origin-when-cross-origin`, `x-content-type-options: nosniff` and a `content-security-policy` whose `script-src` has no `unsafe-inline` (vectors 5 and 22)
- [ ] 2. `src/lib/utils/html.test.ts` adds the raw-text-container cases (`textarea`, `template`, `noembed` holding an `img onerror`) and a `javascript:` anchor (vector 17)
- [ ] 3. `tests/integration/invite-sign-in.test.ts` asserts an unknown invite token is a 404 (vector 13)
- [ ] 4. An integration check that an unexpected server error shows the error reference (`data-testid="error-reference"`) and no query text ("Failed query"), driven without relying on the NUL-byte bug (vector 21)
- [ ] 5. `src/lib/geocoding.test.ts`: a query containing `/ @ # ?` still requests only the Photon host with the text in `q` (vector 27)
- [ ] 6. Every vector whose test is named as existing keeps that test; none are removed

## Full audit text (for reference)

## Requirement

Lock-in from the input and output handling audit (01M5A34YEEF5NVYZ4FXY7C25A9), 2026-10-19. I tried these vectors and they held. Each entry gives where the defence lives and the test that pins it: an existing test is named, otherwise the test to add is named (per AGENTS.md: rules that must hold and bugs we hit; no render-only tests, nothing for framework behaviour).

How they were tried:
- the existing production build (`node build`) and a dev server, each on its own port against the dev DB, with anonymous requests only;
- read-only `SELECT` casts on the dev DB;
- a scratch script running hostile input through `sanitizeRichText` / `stripHtml` / `escapeHtml`;
- Kit's `getRequest` with a body limit in a scratch harness;
- code reading where the vector needs a signed-in account (the audit creates none).

Vectors that overlap the earlier lock-ins are named there and not repeated: 01M5A4YWDG7WFE35HB9NCBWMEY (stored-description XSS variants, markdown link schemes, popup escaping, calendar SUMMARY/LOCATION escaping, expired invites) and 01M5A4W5GTV7RNJ8T4MHFVTAKJ (anonymous upload 401, guard table).

## Tokens: entropy, rotation, leakage

1. **Calendar token entropy.** `crypto.randomUUID()` (122 random bits) in `src/lib/server/utils/calendar.ts:13,19`. An unknown token is a 404. Existing: `tests/integration/calendar-feed.test.ts` "an unknown token is a 404". No test for entropy itself.
2. **Calendar token rotation.** `regenerateCalendarToken` replaces the token and the old one stops working at once. Existing: calendar-feed.test.ts "regenerating the link stops the old token working". There is no expiry by design: it is a subscribe URL, and the feed exposes only the owner's attending events.
3. **Invite token entropy.** `ulid()` (ulid 3.0.2) draws its 16 random characters from `crypto.getRandomValues`, one byte each scaled to 32 symbols with no bias (80 random bits). The 48-bit timestamp prefix adds nothing. Brute force online is not practical. No test.
4. **Invite rotation and expiry.** A link lasts 48 h (`magic-links.remote.ts:12`), and `regenerateLink` deletes every link of the event before issuing one. Expiry is checked on use (`invite/[token]/+page.server.ts:14`). Expired-link test: asked for in 01M5A4YWDG7WFE35HB9NCBWMEY. Regeneration test: asked for in 01M5A4W5GTV7RNJ8T4MHFVTAKJ. A manager calling `generateLink` directly can hold several live links for their own event. The UI offers it only when none exists, so I accept it as their choice.
5. **Referer leakage.** `referrer-policy: strict-origin-when-cross-origin` is set on every response (`src/hooks.server.ts:44`, verified on the build, including error pages), so `/invite/<token>` and `/sign-in?redirect=/invite/<token>` send only the origin to third parties (OSM tiles, Turnstile, R2 images). **Add:** one integration assertion that a page response and the feed response carry `referrer-policy` and `x-content-type-options: nosniff`. Nothing pins `SECURITY_HEADERS` today.
6. **og:url leakage.** `TOKEN_ROUTE_PREFIXES` in `src/lib/utils/meta.ts:53`, and query strings are never used. Existing: `src/lib/utils/meta.test.ts` "withholds the URL on token-bearing routes" and `tests/integration/link-preview.test.ts` "a token route never publishes its URL".
7. **Error reports (GlitchTip).** `scrubEvent` drops the request, breadcrumbs and the URL transaction, and `redactErrorText` cuts Drizzle params. Existing: `src/lib/error-tracking.test.ts` (scrubEvent, metadata allowlists, query value redaction). The *log line* is the gap, filed as 01M5A5KMZWSA69YYR47S0R916E.
8. **Log line route.** The log names the route id, never the URL. Existing: `src/lib/server/errors.test.ts` "names the route id, so a token in the URL never reaches the log".
9. **Feed caching.** `Cache-Control: max-age=3600, private` (`feed.ics/+server.ts:44`), so shared caches do not keep a token-keyed response. No test (one header, reviewed).

## Malformed path and query input

10. **Malformed percent-encoding** (`%ZZ`, invalid UTF-8 `%C0%AF`): 400 "Malformed URI" from Kit in the build (only Vite's dev middleware 500s). Framework behaviour, no test.
11. **Over-long URL or query** (20 KB path, 100 KB remote payload): 431 from Node's header limit. Framework, no test.
12. **Non-numeric year** (`/events/past/abc`): 400 from the `Number.isInteger` check (`events/past/[year]/+page.server.ts:14`). Pin it in the integration test of 01M5A5KMSNKYDQ613E8D06KDSS alongside the range cases.
13. **Well-formed but unknown ids**: `/events/<unknown>` 404 (existing: `tests/integration/public-pages.test.ts` "a missing event is a 404 rather than a crash"), `/invite/<unknown>` 404, `/api/calendar/<unknown>/feed.ics` 404 (calendar-feed.test.ts). **Add** the unknown-invite 404 to `invite-sign-in.test.ts`.
14. **Wrong-typed remote argument** (valid encoding, wrong shape): 400 Bad Request from the valibot schema, not logged. Framework plus schema, no test.
15. **Garbage session cookie** (NUL, bad signature, malformed encoding, 7 KB value): treated as signed out, 200. Better Auth's behaviour, no test.
16. **Oversized bodies**: adapter-node's `BODY_SIZE_LIMIT` (default 512K) answers 413 before a handler reads more, for remote forms and the upload endpoint alike. How this interacts with the 10 MB upload promise is filed as 01M5A5KN8H0S977JQ72P7C1AAH.

## Rich text and HTML output

17. **sanitizeRichText against 20 hostile inputs.** All came out inert:
    - `javascript:` link, `style`/`onclick` attributes, `img onerror`, SVG `xlink:href`
    - script inside `pre`/`code`, comment-hidden markup, split `<scr<script>ipt>`, entity-encoded markup
    - `template`, `textarea`, `title`, `xmp` and `noembed` raw-text containers
    - `iframe srcdoc`, the math/mglyph/style mutation, `form`/`button`, `input autofocus onfocus`
    - a NUL byte before markup

    Defence: `allowedAttributes: {}` and the tag allowlist in `src/lib/utils/html.ts:3-25`. Existing: `src/lib/utils/html.test.ts` (script dropped, attributes stripped, disallowed tags). **Add** to html.test.ts: the raw-text-container cases (`textarea`/`template`/`noembed` holding an `img onerror`) and the `javascript:` anchor. These are the vectors where sanitizers have historically differed from browsers.
18. **stripHtml output** is only ever Svelte text (home excerpt, meta description), so decoded `&lt;script&gt;` stays literal text. Existing: `meta.test.ts` "strips rich text to plain text, dropping tags and script"; html.test.ts stripHtml cases.
19. **The one `{@html}`** (`RichContent.svelte`) receives only server-sanitized strings: event description (read side), schedule description (both sides), bio markdown. The pins are in 01M5A4YWDG7WFE35HB9NCBWMEY. Write-side hardening for events is filed as 01M5A5KNBFVCX1H6YW8S63S799.
20. **Rich-text editor seed.** The edit form seeds TipTap from the sanitized `getEvent` description (`event-details.remote.ts:47`). On a failed submit, Kit echoes the user's own input back into the editor, so that is self-only, and TipTap parses it into its schema rather than inserting it as HTML. No test.
21. **Error page.** An unexpected error shows only "Internal Error" plus an 8-hex reference. I checked the build's HTML for `/events/%00`: no SQL, params or stack. HttpError messages are all fixed strings (no `error(…)` interpolates input). Existing: `errors.test.ts` "reports an unexpected error with reference…". **Add** to an existing integration spec: a page that 500s shows `data-testid="error-reference"` and no "Failed query" text. The NUL-byte route stops working as a 500 trigger once 01M5A5KMSNKYDQ613E8D06KDSS is fixed, so drive the 500 with a mocked failure or drop this pin.
22. **CSP on every response**, error pages included: `script-src 'self'` + nonce + Turnstile, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'` (`svelte-options.js`). It is defence in depth for 17-20. Pin it with the header assertion in 5 (check that `content-security-policy` contains `script-src 'self'` and no `unsafe-inline` for scripts).

## Uploads and R2

23. **Declared non-raster types** (SVG and anything outside jpeg/png/webp/gif/avif) are refused (`upload-image/+server.ts:11,23`). Existing: `tests/integration/event-picture.test.ts` "the upload endpoint refuses SVG". Content sniffing is the gap, filed as 01M5A5KN5RTRWP4QSDAYGGDHNX.
24. **R2 keys are never user-controlled.** `events/<fresh ulid>.<ext from the allowlisted type>` (`r2.ts:39`), so no traversal or overwrite. Existing: `src/lib/server/r2.test.ts` "places the file under the events/ prefix", "generates a unique key on each call", extension cases.
25. **Picture URL from the hidden field.** Another host, a lookalike host, a nested path, a legacy key and another event's picture are all refused by `isUploadedPictureUrl` + `pictureUsedElsewhere` (`eventForm.ts:65-108`). Existing: `eventForm.test.ts` "isUploadedPictureUrl" cases and event-picture.test.ts "an event cannot take over another event's picture". A URL with quotes or angle brackets after `/events/` passes the prefix check, but it only ever reaches Svelte-escaped `src`/`content` attributes. No style or `url()` sink exists. No test.
26. **deleteImage on a non-bucket URL** derives a key that does not exist, so the delete is harmless. Release is reference-checked. Existing: eventForm.test.ts releasePicture / releaseEventPictures cases.

## SSRF and URLs

27. **No server-side fetch of a user-supplied URL.** Pictures and avatars are never fetched by the server. The only server-side geocoding call goes to the fixed `PHOTON_URL`, with the location text set through `searchParams` (`src/lib/geocoding.ts:60-62`). fpa-api is covered in 01M5A4YWDG7WFE35HB9NCBWMEY. **Add** to `src/lib/geocoding.test.ts`: a query containing `/`, `@`, `#` and `?` produces a request to the Photon host with the text only in `q`.
28. **Avatar `javascript:`/`http:`/SVG `data:`.** Nothing executes: browsers never run script from `<img src>`, and CSP `img-src` has no `http:`. Tracking and bloat are filed as 01M5A5KN2T6V88JGAS5NAEB99R. No test.


## Status (fill in)

- Done:
- Mutation checks (defense removed → test that failed):
- Integration specs not run (environment):
- Check results (`npm run check`, `npx vp test run` counts):
- Blocked:
