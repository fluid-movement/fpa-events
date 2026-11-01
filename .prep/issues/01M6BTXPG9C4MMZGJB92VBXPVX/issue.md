---
title: Dedicated Postgres backups and a tested restore
kind: manual
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - ops
priority: low
---

Owner decision 2026-11-01: the Coolify instance backup and active Hetzner backups are enough for go-live. Follow-up: add dedicated database backups (e.g. Coolify scheduled backup to S3) and try one restore of the Postgres data.

## Open questions
