---
title: Clean up after the cutover
kind: manual
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
depends_on:
  - 01M4B48HMSZ3XMXPW8MKQJMP3T
tags:
  - cutover
priority: low
---

Source: tools/migrate/README.md "Cutover runbook"; /features/legacy-migration.md.

Once the new site has run without data problems: remove the `LEGACY_*` env vars from Coolify, delete `tools/migrate/` from the repo along with /features/legacy-migration.md's scope, keep a final legacy database dump as the archive for everything not migrated (including the dropped membership data), and decommission the Laravel app. `src/lib/server/password.ts` stays while any bcrypt hash remains.

## Open questions
