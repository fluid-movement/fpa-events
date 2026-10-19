---
title: Legacy database backups are empty 1 KB dumps of the postgres database, not the Laravel data
kind: manual
parent: 01M5A34Z75BVD5BE4AZWWEDCPA
tags:
  - security
---

Deployment audit, 2026-10-19, parent 01M5A34Z75BVD5BE4AZWWEDCPA.

**Vulnerability (integrity/availability).** The legacy database's scheduled Coolify backup succeeds every day but every dump is 1,055 bytes — the size of an empty `pg_dump -Fc` — from the first execution on 2026-03-15 to the latest on 2026-10-19 (219 executions). The dump files are named `pg-dump-postgres-*`, i.e. they dump the `postgres` database, while the Laravel app is configured with its own `DB_DATABASE`. So the legacy data the migration imports from, and which the cutover runbook archives afterwards, very likely has no working Coolify backup at all; only Hetzner's VPS backups (decision 01M57FTWF3ZR0A2JYQ66TVTABT), whose status this audit cannot see, could restore it.

**Where.** Coolify database s88c8cos8gkoggk8w0cckos0 ("Prod Database"), scheduled backup i0ogsk8o8kwogow4o0kows0s (daily, saved to S3 storage jwsgo80g4s8g0sk4448wswc8, local retention 0). `list_backup_executions` shows the sizes and file names. The new app's database (nr234g3tapphcp539wvuocvp) has no Coolify backup schedule, which is the deliberate decision above, not a finding.

**How to reproduce (class).** List the backup executions and compare the sizes with the size of the Laravel database; or restore one dump into a scratch database and list its tables. Do not restore over a live database.

**Severity.** Medium. It is not a confidentiality leak, but a failed or botched import, or a disk loss before the cutover, would leave no restorable copy of legacy accounts and events. Recommend treating a verified, restorable full dump of the Laravel database as a precondition of the import/cutover (blocking for the cutover, not for the code).

**Fix.** Point the scheduled backup at the Laravel database name (Coolify's "Databases to backup" field), check that the next dump has a plausible size and restores, and protect the S3 bucket it goes to (who can read it — the dumps contain password hashes and emails). Take the final archive dump from the same corrected setup.

## Open questions
