---
title: 'Audit the deployment surface: Coolify, Hetzner, GlitchTip, secrets'
kind: manual
parent: 01M57PY1QJJ0YFYZYQR93GCF0C
tags:
  - security
priority: high
---

Part of the pre-go-live security audit (01M57PY1QJJ0YFYZYQR93GCF0C). Review the area against the code as it stands and, where useful, the running app. The audit is read-only: make no code, config, dependency or data changes, and file every finding. Record non-obvious conclusions as prep findings or decisions. The app is on SvelteKit 3 (see AGENTS.md and the knowledge base).

Scope: Coolify env for the app (secrets in build args vs runtime, the LEGACY_* variables that the runbook removes after cutover), the Hetzner firewall and exposed ports, the Postgres and GlitchTip exposure, who can reach the Coolify and GlitchTip UIs, GlitchTip access control and what its stored events contain, the Postgres role the app connects as (superuser or least privilege) and how backups are stored and protected, the security headers and CSP as served in production, HTTP-to-HTTPS behaviour, and Mailgun, Turnstile and R2 key scopes. Use the Coolify and GlitchTip MCP tools (read-only calls only); for what they cannot show (the Hetzner firewall, GlitchTip membership), file a question for the user rather than guessing. Headers on the live domain can only be checked after cutover; that part does not block go-live.

Probing: run unit tests freely. To try an attack against the app, start your own dev server on a port no one else uses (not 5173 or 5174) against the dev database; never reset, migrate or seed a database and never run the integration suite, since another auditor may be using it. Against production, only passive read-only requests (fetching pages and headers); no attack traffic, no load.

Filing findings: for every finding, create a child issue under this issue with `prep new --parent <this issue> --tag security`. State the vulnerability, where it is (file and line), how to reproduce it, its severity and whether you think it blocks go-live; the acceptance names the fix and a regression test where AGENTS.md calls for one. Do not put secrets or working exploits in the record. Never leave a finding only in a report or the chat.

Lock-in: also file one child issue titled "Lock in the verified defenses: <area>" listing every attack vector you tried that held, where the defense is enforced, and the test that should pin it (unit or integration, per AGENTS.md). Name existing tests that already cover a vector instead of asking for a new one.

Decision: /decisions/01M5A44HQ85VNXP0CBCKW60592.md

## Open questions
