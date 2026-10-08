---
title: Report server and browser errors to Sentry
kind: code
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
depends_on:
  - 01M4AXA71QQFQSWN1VVS4KXC9F
tags:
  - observability
priority: high
---

Source: project sweep, 2026-10-08; user: Sentry integration is a must before go-live.

Unexpected errors must reach an error tracker with alerting, from both the server and the browser. Today only the server logs them (`handleError` in `src/hooks.server.ts`, to Coolify's ephemeral log) and there is no `src/hooks.client.ts`, so a crash in hydration, a Leaflet map or the rich-text editor is invisible.

What the integration has to respect:

- **Same reference id.** The 8-character `errorId` from `describeServerError` (`src/lib/server/errors.ts`) is attached to the Sentry event, so a user's quoted reference finds it.
- **Only unexpected errors.** Errors thrown with `error()`, 404s and validation failures stay out, matching what is logged today.
- **No credentials or personal data.** `sendDefaultPii: false`; the route id, never the raw URL, because `/api/calendar/[token]/feed.ics` and `/invite/[token]` carry their credential in the path; strip request URLs, query strings, cookies and breadcrumbs that contain them. The user is identified by id only, no email or name.
- **Blank DSN disables it**, like Mailgun, R2 and Turnstile: declared in `src/env.ts`, absent from `.env.test`, so dev and the integration suite send nothing.
- **Readable stacks**, by uploading source maps at build time or relying on the server's already-readable frames; browser stacks need the maps.
- **Alerting**: a new issue notifies the maintainer by email.
- **Privacy policy** names the service as a processor (see the legal and privacy issues).

Knowledge: /architecture/build-and-deploy.md (Errors in production).

The privacy policy (`src/routes/privacy-policy/+page.svelte`) gains a section for the tracker: what an event contains, where it is stored, the processor, and its retention.

## Open questions
