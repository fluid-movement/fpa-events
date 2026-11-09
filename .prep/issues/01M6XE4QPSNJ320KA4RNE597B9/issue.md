---
title: Cut down the test suite so commit and push are fast
kind: code
tags:
  - testing
---

Committing and pushing take too long. The pre-push hook runs build, test DB migrate, then the whole Playwright suite (196 tests across 31 files, `workers: 1`, one local retry, plus a second Turnstile server) and takes about 10 minutes with the CPU pinned at 100%. The pre-commit hook adds lint-staged, `npm run check` and all of Vitest (58 files).

Goal: a push that does not tie up the machine for 10 minutes, without losing coverage of what can actually break.

Starting points (verify before acting):
- Measure first: per-file timings for `npm run test:integration` and `npm run test`, and the cost of the build and the second Turnstile server.
- Apply the AGENTS.md testing rule: drop or merge tests that only prove something renders, repeat coverage that already exists a level down, or exercise dev-only tooling. Candidates are the overlapping input-hardening specs (malformed-forms, malformed-input, event-input-hardening, output-hardening, auth-user-input) and per-flow specs that could share one signed-in session.
- Move the slow end-to-end flows out of pre-push into a separate command (e.g. `npm run test:integration:full`), and keep a small smoke set on push.
- Consider letting independent specs run in parallel; the config says specs share one DB and one seeded user, so that is a larger change.
- `playwright.config.ts` still starts its servers with `vp run dev:test` and `vp run dev:test:turnstile`, but vite-plus was removed and `package.json` has plain `vite dev` scripts. Switch these to `npm run dev:test` / `npm run dev:test:turnstile`.
- The user will also see how the suite runs on their next machine; that timing is useful input.

Open for the owner: the target push time, and whether any integration coverage may move off the push gate (the hooks are the only gate before a Coolify deploy, with no CI).

## Open questions
