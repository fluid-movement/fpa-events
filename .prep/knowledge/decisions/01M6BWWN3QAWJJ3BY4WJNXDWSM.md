---
type: decision
title: Go live with four pictures unsized; audit, database role and dedicated backups follow launch
description: Owner decisions 2026-11-01 on what is not a go-live blocker
date: "2026-11-01"
---

Decided by the owner on 2026-11-01, before the cutover:

- Four events with pictures have no stored width/height (the legacy data had none). They fall back to the plain hero layout. New uploads record their own size in ImageUpload.svelte, so no importer change or backfill was built. Issue 01M5A9DZRY78994W2691AE76XE was dropped.
- The test-versus-production audit (01M6BAV2H9GV1CWC0YDK5QEX6V), the security audit parent (01M57PY1QJJ0YFYZYQR93GCF0C), the app database role (01M5A7ZAASTQDDDGXYAXMHPFZD) and dedicated Postgres backups (01M6BTXPG9C4MMZGJB92VBXPVX) moved to Follow-up after launch. Reason: the Coolify instance backup and Hetzner backups are enough for launch, traffic is low, and the database port is firewalled.
- Cutover order: Laravel in maintenance mode, final migrate:all, then move the domain in Coolify and update BETTER_AUTH_URL and ORIGIN, then delete tools/migrate (done in 02cf8ed).
