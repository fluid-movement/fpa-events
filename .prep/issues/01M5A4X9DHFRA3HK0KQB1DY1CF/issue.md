---
title: Run the legacy import with read-only legacy credentials
kind: manual
parent: 01M5A45SJ0DTHEX1G0R86JKXEJ
tags:
  - security
priority: low
---

Finding from the untrusted-upstream-data audit (01M5A45SJ0DTHEX1G0R86JKXEJ).

**Issue.** The README runbook (`tools/migrate/README.md`, "Running on the server") has the import run inside the deployed, internet-facing app container, with `LEGACY_DATABASE_URL` and `LEGACY_R2_*` added to the app's own environment. The tool only ever reads the legacy side (`migrate.ts` only SELECTs from it; `pictures.ts` only Head/Get on the legacy bucket, and refuses `--wipe-target` when the buckets match, `pictures.ts:76`). But the runbook does not ask for read-only credentials, so in practice the old app's owner credentials sit in the new app's environment until cutover step 4 removes them. Anything that leaks or abuses the app's environment in that window (a dependency, a debugging session, a misconfigured error report) would expose write access to the legacy database and bucket, which are the archive for the dropped tables (`/decisions/product-scope.md`).

**Reproduce.** Not a code defect: inspect which credentials the Coolify env holds for the event app while the migration is configured.

**Severity.** Low (blast-radius reduction; no known leak path. Error reports carry no request data, and `$app/env/private` is server-only).

**Blocks go-live?** No, but it is cheapest to do before the final migration, and the step-4 removal of `LEGACY_*` must not be skipped.

## Open questions
