# todo: lock in the verified data-exposure and abuse defenses

Branch `cloud/lockin-data`. Tracking issue (prep, local only): `01M5A5B3PG61A9PBZ68BYZT3E2`.
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
  and push this branch only (`git push --no-verify origin cloud/lockin-data`). Never push `main`.

## Notes since the audit (code moved on; check before relying on line numbers)

- Attendee emails are now sent only to the event owner and site admins (decision recorded by the user);
  co-organizers get `email: null`. See `src/routes/events/[id]/admin/+layout.server.ts` and the existing
  `tests/integration/privacy.test.ts`, which already checks the manage-area `__data.json`. Criterion 1 is about
  the PUBLIC event page — extend privacy.test.ts, don't duplicate the manage-area cases.
- Invite links are redeemed only by an explicit same-origin POST (`src/routes/invite/[token]/data.remote.ts`);
  tests in `tests/integration/organizing.test.ts`.
- The upload endpoint now has a per-user limit (20/h, 429) and the fpa-api reads are cached; tests exist in
  `src/routes/api/events/upload-image/server.test.ts`, `src/lib/server/upload-limit.test.ts`, `src/lib/server/fpa-api/cache.test.ts`.
- Email sending: `src/lib/server/email.ts` (dev fallback logs; production refuses without keys via
  `src/lib/server/production-config.ts`). Criterion 2 wants `src/lib/server/email.test.ts`.
- Kit options live in `svelte-options.js` (Kit 3 refuses svelte.config.js). Criterion 3 can be a small unit test
  that imports `svelte-options.js` and asserts `csrf.checkOrigin` is not false (and that the file still passes the
  options through), so a future edit fails a test instead of silently opening cross-site posts.
- `src/lib/server/remote-guards.test.ts` maps every remote function to its guard; keep it passing.

## Acceptance criteria (from the issue)

- [ ] 1. Integration (`privacy.test.ts`): the public event page's serialized data contains neither an opted-out attendee's name nor any attendee email, for a signed-out and a signed-in non-manager view
- [ ] 2. Unit (`src/lib/server/email.test.ts`): verification and reset messages carry only the URL — a user name containing markup appears in neither subject nor body
- [ ] 3. `svelte-options.js` keeps Kit's csrf origin check on (no `csrf.checkOrigin: false`), pinned by a test; the cross-site remote/upload 403s were verified on a production build and are re-checked by hand after a Kit upgrade (write the repeatable manual check as a short section in the Status below)
- [ ] 4. Every vector whose test is named as existing still has that test; none are removed

## Full audit text (for reference)

## Requirement

From the data-exposure and abuse audit (01M5A45SRVRT71JY7RKBHSZBWE), 2026-10-19. These vectors were tried and held. Pin each one so a later change cannot reopen it quietly. Where a test already covers a vector it is named; otherwise the test to add is named, per AGENTS.md (privacy visibility and authorization are "rules that must hold").

How they were tried: every server load, remote query and endpoint was read and its returned shape compared with what the templates render, for signed-out, signed-in, attendee, manager and owner (the guard table in 01M5A4W5GTV7RNJ8T4MHFVTAKJ was reused for who reaches what). Cross-site requests were sent with curl to the existing production build (`node build`, own port, dev database) with a foreign, `null` and missing `Origin`, plus a same-origin control. Email flows were traced through `src/lib/server/email.ts`, the templates and Better Auth 1.7.7's sign-up and origin-check code. The dev database has no events, so per-event data shapes are from code, not live rows.

Important for anyone re-checking: SvelteKit 3 skips both Origin checks when `__SVELTEKIT_DEV__` is set (`respond.js`), so they cannot be observed on `vite dev` or by the integration suite (which runs `npm run dev:test`). Use a production build. Also, the adapter-node build bakes `origin` at build time (undefined here) and derives the request origin from the Host header with protocol defaulting to `https`; a runtime `ORIGIN` env var is not read.

## Cross-site requests (acceptance 3)

1. **Cross-site call to a remote form/command** (`toggleRsvp` as the sample; form-encoded, JSON, `Origin: null`, no Origin) → 403 "Cross-site remote requests are forbidden" before the handler runs. Same-origin control reached the handler. Defense: Kit's `is_remote_forbidden` (any non-GET remote call whose Origin is not the app's own; not configurable, ignores `trustedOrigins`). Test: none possible on the dev server; no test asked for. Re-check by hand after a Kit upgrade with a production build.
2. **Cross-site multipart or text/plain POST to `/api/events/upload-image`** → 403 "Cross-site POST form submissions are forbidden". Defense: Kit's `csrf` origin check, which stays on because `svelte-options.js` does not set `csrf.checkOrigin`. Non-form content types pass Kit's check but need a CORS preflight the app never answers, `request.formData()` rejects them, and the session cookie is `SameSite=Lax` (Better Auth default), so a cross-site POST arrives anonymous → 401. Test: keep `csrf` out of `svelte-options.js`; the anonymous 401 is already asked for in 01M5A4W5GTV7RNJ8T4MHFVTAKJ acceptance 3.
3. **Cross-site read of a remote query** (GET is allowed cross-origin): no `Access-Control-Allow-*` header is sent, so the browser will not hand the JSON to the third-party page; no remote query writes anything. Test: none needed.
4. **State change by GET**: only two loads write on GET. `ensureCalendarToken` (dashboard, attending) is idempotent and self-only — held. The invite load is not — filed as 01M5A59J0WX9GYVYNN3PT2XE99.

## Over-fetching (acceptance 1)

5. **Root layout**: returns only `signedIn: boolean`. Better Auth's `get-session` returns the caller's own user only.
6. **Home, `/events`, `/events/past/[year]`**: event columns plus attendee count; the only user field is the owner's opaque `userId` (no endpoint accepts a user id, so it is accepted as is). `withUserStatus` only ever reads the caller's own rows, so no other user's RSVP reaches a viewer. Verified the live `__data.json` shapes on the build server.
7. **`/events/[id]`, signed out / signed in / attendee**: named attendees are filtered by `showAttendance` in the SQL (`src/routes/events/[id]/+page.server.ts` lines 47-58) and carry only `event_user.id`, name and image — no user id, no email; the viewer gets only their own status and role. Existing tests: privacy.test.ts "an opted-out attendee is not named but still counted" and "…not listed in the attendees modal" — but they assert the rendered UI only. **Add**: an integration assertion that the event page's serialized data (fetch `/events/<id>/__data.json` or read the page HTML) contains neither the opted-out attendee's name nor any attendee email.
8. **Manage area (manager/owner)**: attendee emails and the magic link are returned only behind `canManageEvent` in the admin layout (privacy.test.ts "organizers still see opted-out attendees in the manage area"; the schedule leaf gap is 01M5A4T2FTPAV4Y429PTTQZKJ7; whether co-organizers should get emails is 01M5A59J9VWFG5T8XXYRF3EV1E). `getEvent` returns event fields only, behind `requireEventManager`.
9. **Self-only data**: `settings/profile` returns the caller's own name and email; `getPrivacySettings` the caller's own flag; dashboard/attending the caller's own calendar token. Covered by the guards in 01M5A4W5GTV7RNJ8T4MHFVTAKJ.
10. **Calendar feed**: returns the token owner's name and their `attending` events only — no emails, no other attendees. calendar-feed.test.ts "serves the attending events as iCal", "an unknown token is a 404".
11. **Error output**: unexpected errors reach the client as "Internal Error" plus a reference (`handleError`); fpa-api failures return a message with the upstream path but never `FPA_API_URL`. Accepted.

## Email abuse (acceptance 2)

12. **User-controlled text in email**: subjects are fixed strings and bodies contain only the Better Auth URL (`sendVerificationEmail`/`sendPasswordResetEmail` take `{ email }` and `url`, nothing else). Names and event titles never reach an email. Better Auth URL-encodes `callbackURL` into the link and its origin-check middleware rejects a `callbackURL`/`redirectTo` outside the trusted origins. **Add**: a unit test in `src/lib/server/email.test.ts` that the verification and reset messages carry nothing but the URL (a user whose name contains markup produces a subject and body without it).
13. **Mail to an arbitrary address**: only the auth flows send mail (sign-up, resend verification, password reset, verification on sign-in), all behind the Turnstile captcha plugin when `TURNSTILE_SECRET_KEY` is set (whether it is set in production, and Better Auth's own rate limit, belong to the deployment and authentication audits). A repeat sign-up for an existing address sends nothing (`onExistingUserSignUp` unset). Magic-link invites send no email at all. The dev test-email form is a 404 in production (01M5A4W5GTV7RNJ8T4MHFVTAKJ vector 11). Existing: auth-email.test.ts "does not leak email existence on re-registration" (response only). No new test: the no-second-email behaviour is Better Auth's; re-check if `onExistingUserSignUp` is ever configured.

## Rate limits outside auth (acceptance 2)

14. **Event creation and edit**: a Turnstile token per submit (`requireTurnstile` in `createEvent` and `updateEvent`) on top of a verified account. Test: `src/lib/server/turnstile.test.ts` covers the verifier; no new test.
15. **RSVP**: `toggleRsvp` flips only the caller's single row per event (unique index), notifies nobody and sends no mail — bounded. rsvp.test.ts.
16. **Manager writes** (schedule, venues, magic links): need a manager seat; bounded by who can reach them. Covered by 01M5A4W5GTV7RNJ8T4MHFVTAKJ.
17. Uploads and the anonymous fpa-api queries did not hold: 01M5A59J3TNS0MTWYS66GRGB46 and 01M5A59J6Y3PG6372RAZ3A8EHP.

## Outside this area, passed on

- `getPlayerProfile`/`getEventResults` forward the id with `encodeURIComponent`, so `..` survives and the server fetches `/` of fpa-api; harmless today (GET, public upstream) — for the untrusted-upstream audit.
- A malformed remote-query `payload` (an empty one, for example) goes through `handleError` as an unexpected server error (devalue's `SyntaxError`), so it is logged and would be reported to GlitchTip — for the input/output audit.
- Whether `TURNSTILE_SECRET_KEY` and the proxy's request limits are set in production — for the deployment audit.


## Status (fill in)

- Done:
- Mutation checks (defense removed → test that failed):
- Integration specs not run (environment):
- Check results (`npm run check`, `npx vp test run` counts):
- Manual Kit-upgrade check (criterion 3):
- Blocked:
