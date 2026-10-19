---
title: Audit dependencies and the supply chain
kind: manual
parent: 01M57PY1QJJ0YFYZYQR93GCF0C
tags:
  - security
priority: high
---

Part of the pre-go-live security audit (01M57PY1QJJ0YFYZYQR93GCF0C). Review the area against the code as it stands, test what can be tested, then fix each finding in place or file it as its own issue. Record non-obvious conclusions as prep findings or decisions. Brief any implementer on SvelteKit 3 idioms (see AGENTS.md).

Scope: package.json and package-lock.json for the app and tools/migrate, install scripts, known advisories (npm audit and the lockfile), peer ranges for SvelteKit 3, the Node 24 pin, and what the Docker image ships (tools/migrate with credentials-bearing env, dev dependencies at runtime).

Filing findings: for every finding you do not fix in place, create a child issue under this issue with `prep new --parent 01M5A3500S3M2DBNP0EZ1EC4WK --tag security`. State the vulnerability, where it is (file and line), how to reproduce it, its severity and whether you think it blocks go-live; the acceptance names the fix and a regression test where AGENTS.md calls for one. Do not put secrets or working exploits in the record. A finding you fix in place is logged on this issue with `prep log` instead. Never leave a finding only in a report or the chat. Decision: /decisions/01M5A3G5EMHG5FRY0CANFPSXN2.md

## Open questions
