---
title: 'Lock in the verified defenses: data exposure and abuse'
kind: code
parent: 01M5A45SRVRT71JY7RKBHSZBWE
tags:
  - security
---

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

## Open questions
