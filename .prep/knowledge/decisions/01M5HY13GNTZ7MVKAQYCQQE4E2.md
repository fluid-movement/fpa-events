---
type: decision
title: The migration is a self-contained bundle in tools/migrate, deleted after go-live
description: 'Decided by the user 2026-10-22: all legacy-migration code, tests, smoke suite and runbook live under tools/migrate and nowhere in the app, so that deleting the folder after the switch guarantees the migration can never run again; the old application is removed at the switch.'
date: "2026-10-22"
issue: 01M5HY132E2E612NADX33GAY6V
scope:
  - tools/migrate/**
---


