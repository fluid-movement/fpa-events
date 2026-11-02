---
type: decision
title: Review the dependency tree monthly and before dependency-changing releases
description: Same rule, updated now that tools/migrate is deleted and vite-plus is removed
date: "2026-11-02"
supersedes:
  - 01M5A7BXTN2R18VM3V9S0AJPHQ
---

The rule of 01M5A7BXTN2R18VM3V9S0AJPHQ still holds, restated for the current repo as of 2026-11-02: run npm audit and review the outdated report for the single root dependency tree (package.json and its lock) monthly and before any release that changes dependencies. tools/migrate was deleted after go-live, so there is no second tree, and vite-plus is gone, so no dev-only package needs a Node floor above the deployed Node 24. The Node floor check one-liner in AGENTS.md (Quality gates) is still the way to test the lock against the deployed Node version.
