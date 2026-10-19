---
title: Audit authorization on every remote function and route
kind: manual
parent: 01M57PY1QJJ0YFYZYQR93GCF0C
tags:
  - security
priority: high
---

Part of the pre-go-live security audit (01M57PY1QJJ0YFYZYQR93GCF0C). Review the area against the code as it stands, test what can be tested, then fix each finding in place or file it as its own issue. Record non-obvious conclusions as prep findings or decisions. Brief any implementer on SvelteKit 3 idioms (see AGENTS.md).

Scope: the data.remote.ts files under src/routes (events/[id], events/create, settings/account, settings/privacy, settings/profile, dev/emails), the +page.server.ts loads, and src/lib/server/authz.ts. For each remote function and load, confirm the right guard runs first (requireSignedInRequest, requireEventManager, requireEventOwner), that ids in the request are checked against the caller, and that nothing dev-only (dev/emails) is reachable in production.

Filing findings: for every finding you do not fix in place, create a child issue under this issue with `prep new --parent 01M5A34Y0620NBQFRA09MKZWNN --tag security`. State the vulnerability, where it is (file and line), how to reproduce it, its severity and whether you think it blocks go-live; the acceptance names the fix and a regression test where AGENTS.md calls for one. Do not put secrets or working exploits in the record. A finding you fix in place is logged on this issue with `prep log` instead. Never leave a finding only in a report or the chat. Decision: /decisions/01M5A3G5EMHG5FRY0CANFPSXN2.md

## Open questions
