---
title: Schedule production database backups and test a restore
kind: manual
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
tags:
  - ops
  - database
priority: critical
---

Source: project sweep, 2026-10-08. Nothing in the repo or in prep covers backups.

Once the cutover runs, the production Postgres holds the only copy of every account, event and RSVP: the Laravel app is decommissioned afterwards and its final dump is an archive of the legacy data, not a backup of the new app. A failed migration, a bad deploy or a lost Hetzner volume would currently be unrecoverable.

Before the final legacy migration:

- Coolify's scheduled backup for the app's Postgres is enabled, at least daily, with a retention window that is written down.
- Backups are stored off the Hetzner box (an S3-compatible bucket such as a separate R2 bucket), not only on the same server.
- A restore has been carried out once from a real backup into a scratch database, and the steps are written into /architecture/build-and-deploy.md.
- A backup is taken immediately before `npm run migrate` at cutover.

R2 images are not covered by database backups; whether the bucket needs its own protection (versioning, a second copy) is part of this.

Knowledge: /architecture/build-and-deploy.md; memory: the production DB ports are firewalled, so DB work runs from the Coolify terminal.

## Open questions
