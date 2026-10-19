---
title: 'Audit the deployment surface: Coolify, Hetzner, GlitchTip, secrets'
kind: manual
parent: 01M57PY1QJJ0YFYZYQR93GCF0C
tags:
  - security
priority: high
---

Part of the pre-go-live security audit (01M57PY1QJJ0YFYZYQR93GCF0C). Review the area against the code as it stands, test what can be tested, then fix each finding in place or file it as its own issue. Record non-obvious conclusions as prep findings or decisions. Brief any implementer on SvelteKit 3 idioms (see AGENTS.md).

Scope: Coolify env for the app (secrets in build args vs runtime, the LEGACY_* variables that the runbook removes after cutover), the Hetzner firewall and exposed ports, the Postgres and GlitchTip exposure, who can reach the Coolify and GlitchTip UIs, GlitchTip access control, the security headers and CSP as served in production, HTTP-to-HTTPS behaviour, and Mailgun, Turnstile and R2 key scopes.

Filing findings: for every finding you do not fix in place, create a child issue under this issue with `prep new --parent 01M5A34Z75BVD5BE4AZWWEDCPA --tag security`. State the vulnerability, where it is (file and line), how to reproduce it, its severity and whether you think it blocks go-live; the acceptance names the fix and a regression test where AGENTS.md calls for one. Do not put secrets or working exploits in the record. A finding you fix in place is logged on this issue with `prep log` instead. Never leave a finding only in a report or the chat. Decision: /decisions/01M5A3G5EMHG5FRY0CANFPSXN2.md

## Open questions
