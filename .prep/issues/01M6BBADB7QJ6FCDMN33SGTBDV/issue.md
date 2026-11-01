---
title: 'Run the integration suite in parallel: one database and one built server per worker'
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - testing
priority: low
---

Source: the owner, 2026-11-01. A full integration run takes about 6 minutes for roughly 225 tests because playwright.config.ts sets workers: 1. The specs share one database (fpa_events_test) and one seeded user (TEST_USER), and some delete rows by name, so they cannot run side by side today. A faster machine would help only a little: the run is bound by single-thread latency, not CPU.

Direction. (1) One database per worker (fpa_events_test_1..N, migrated and seeded by just test-db) and one app server per worker on its own port. (2) Serve each worker from the production build (npm run build, node build), not vite dev: several vite dev servers share .svelte-kit and reload each other, and this also closes the dev-versus-build gap tracked in 01M6BAV2H9GV1CWC0YDK5QEX6V. (3) A seeded user and storageState per worker instead of the shared TEST_USER. (4) Start with 2 workers: the owner's machine cannot take much more concurrency (see the two-agent cap). Cheaper first steps to weigh: a short smoke set in the pre-push gate with the full suite on demand or nightly, and running only the specs matching changed files while developing.

Related: 01M6BAV2H9GV1CWC0YDK5QEX6V (test-vs-production gaps), decision 01M6BAGWRQYYPWSPRSCKFEFNEM (second dev server for Turnstile specs, which this work would replace).

## Open questions
