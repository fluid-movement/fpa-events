---
type: decision
title: The migration runs in the event app's container via the Coolify terminal
description: migrate:all runs in the app container from Coolify's terminal; the separate migration image is removed
date: "2026-10-24"
issue: 01M5PJ3J1SNKYY6W91T13E5Q2M
scope:
  - tools/migrate/**
---

The legacy migration (tools/migrate, migrate:all) runs inside the deployed event app's container from Coolify's web terminal, with LEGACY_* added to the app's env and the target taken from the app's own DATABASE_URL/R2_* (TARGET_* fallbacks); the deployed image ships tools/migrate and the separate credential-free migration image is removed. The geocode mapping produced there is ephemeral.

Reason (owner, 2026-10-24): the owner already ran the old migration this way and found it fine; the goal of migrate:all was a simpler process, not a new run environment. The owner accepts the low-severity install-time credential exposure (01M5A7A6MS1NSH8EMQ2QRC9WNS) and having the migration tool in the prod image until cleanup (01M4B48HQM4538H4JMG7942N2Y).
