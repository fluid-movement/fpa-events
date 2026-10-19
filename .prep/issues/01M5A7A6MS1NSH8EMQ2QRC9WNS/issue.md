---
title: Install migration dependencies before supplying database and bucket credentials
kind: code
parent: 01M5A3500S3M2DBNP0EZ1EC4WK
tags:
  - security
priority: low
---

Audit finding from 01M5A3500S3M2DBNP0EZ1EC4WK, 2026-10-19.

Severity: low; supply-chain hardening with a confirmed unsafe runbook ordering, not evidence of a compromised dependency. Go-live recommendation: does not block the app launch; change this workflow before the next credential-bearing migration install.

Location: tools/migrate/README.md:34-54, specifically adding LEGACY_* to the event app at 39-44 and running npm install in that credential-bearing container at 51. tools/migrate/src/db.ts:18-23 confirms the tool also uses the app's DATABASE_URL; picture migration uses the app's R2 credentials. tools/migrate/package.json:21 brings tsx and its esbuild install lifecycle into that environment. The lockfile is committed but npm install is not an immutable install contract.

Vulnerability class and reproduction:
Follow the documented order without actually executing the migration: dependencies are downloaded and their lifecycle scripts execute as the app-container user after both legacy and target credentials are supplied. A compromised install-time dependency can read the inherited environment and use those credentials, including for databases reachable only inside the VPS. The tool lock currently has zero npm advisories; that does not make installation a credential boundary. The esbuild postinstall is legitimate, and no malicious package is alleged. This conclusion comes from runbook and package source review; no credentials were read, no installation was performed, and the live image/env could not be inspected.

Fix: prepare the locked migration dependencies in a credential-free build/staging environment using npm ci, inspect/allow only necessary lifecycle activity there, and supply narrowly scoped migration credentials only when executing the reviewed migration artifact. Update the runbook with concrete commands suitable for the actual platform and fail-closed lockfile handling. Do not solve this by blindly turning off required binary preparation, which can break tsx/esbuild. Keep migration credentials temporary.

This is specifically the install-time secret exposure. Removal of legacy env/tools after cutover is already 01M4B48HQM4538H4JMG7942N2Y, and read-only legacy credentials are already 01M5A4X9DHFRA3HK0KQB1DY1CF; do not duplicate those. Actual Coolify build-arg/runtime secret scoping belongs to deployment audit 01M5A34Z75BVD5BE4AZWWEDCPA.

Validation: demonstrate the staging/install step with a harmless fake credential canary or environment allowlist and no real credentials, showing real database/bucket credentials are absent until the execution step. Check lockfile mismatch fails instead of resolving new packages. This is a runbook/install boundary change, so AGENTS.md does not call for a new component/unit/integration test; no DB migration/reset/seed is needed to validate installation.

## Open questions
