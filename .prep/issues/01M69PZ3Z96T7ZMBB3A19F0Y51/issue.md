---
title: Unit tests using localStorage fail on Node 26 (SetupChecklist)
kind: code
tags:
  - tests
priority: high
---

On Node 26 (owner's machine: v26.13.0) all 9 tests in src/routes/events/[id]/admin/SetupChecklist.test.ts fail with 'TypeError: Cannot read properties of undefined (reading 'clear')' at localStorage.clear(). Node 25+ ships its own Web Storage global (localStorage/sessionStorage), which appears to shadow jsdom's in Vitest's jsdom environment. Because pre-commit runs npm run test, every commit in the repo is blocked. The app is unaffected (prod runs Node 24).

Fix the test environment so localStorage is jsdom's on Node 26 and still works on Node 24/22. Test-config only; no app or test-logic changes; do not weaken or skip the tests.

## Open questions
