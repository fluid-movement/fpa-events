---
title: 'Make the foundational flows provable before cutover: close the gaps between the test environment and production'
kind: code
parent: 01M6DZRPCTBMBH2D0BCE51EZKZ
tags:
  - cutover
  - testing
---

Source: the owner, 2026-11-01. Event creation was broken on events-dev (GlitchTip EVENTS-NEW-3, issue 01M6BA31PDYJJRKF1C948JD86R) while the whole integration suite passed. The cause: .env.test blanks the Turnstile, Mailgun and R2 keys, so the suite never ran the configuration production runs, and the integration tests use vite dev, not the production build. The owner wants to switch the app today only if the foundational functions can be relied on without testing each by hand.

Scope. List every difference between the test environment and the deployed app (blank service keys and their fallbacks, vite dev vs the built server, CSP and security headers, BODY_SIZE_LIMIT and proxy headers, anything else found), then rank them by risk to these foundational flows: sign-up and sign-in (incl. a migrated legacy password), password reset and email verification mail, create and edit an event, picture upload, RSVP, organizer invite by magic link, and schedule creation. For each risky difference add a realistic stand-in test (as Turnstile now has: second dev server with Cloudflare's always-pass keys), or record why not. Add a small suite that runs against the production build (npm run build, then node build) covering sign-in, create event, edit event and RSVP. Document a short post-deploy smoke checklist for events-dev and the live domain that covers what tests cannot (real Mailgun delivery, real R2 upload, real Turnstile).

Out of scope: rewriting existing tests; testing presentational components (see AGENTS.md Testing).

## Open questions
