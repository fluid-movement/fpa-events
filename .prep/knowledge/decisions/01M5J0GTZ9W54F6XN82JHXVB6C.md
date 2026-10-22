---
type: decision
title: migrate:all verifies the database before it touches R2
description: 'Order fixed 2026-10-22 after review: DB import, DB-only verification (counts, locations, browser-resolvable picture URLs), R2 wipe, R2 copy, target-picture verification, COMMIT. A failed DB check leaves the target bucket untouched; a failure after the R2 wipe leaves the old DB with a changed bucket, so the operator takes a bucket listing/backup before a real run (README).'
date: "2026-10-22"
issue: 01M5HY132E2E612NADX33GAY6V
scope:
  - tools/migrate/**
---


