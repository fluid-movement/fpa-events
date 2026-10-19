---
title: 'Audit authentication: rate limits, sessions, verification, legacy hashes'
kind: manual
parent: 01M57PY1QJJ0YFYZYQR93GCF0C
tags:
  - security
priority: high
---

Part of the pre-go-live security audit (01M57PY1QJJ0YFYZYQR93GCF0C). Review the area against the code as it stands, test what can be tested, then fix each finding in place or file it as its own issue. Record non-obvious conclusions as prep findings or decisions. Brief any implementer on SvelteKit 3 idioms (see AGENTS.md).

Scope: src/lib/server/auth.ts, password.ts, turnstile.ts, email.ts and the sign-in, sign-up, reset and verify flows. Cover the Better Auth rate limiter (including the per-/64 IPv6 bucketing seen on events-dev), session lifetime and cookie flags, email verification enforcement, password-reset token handling, the transparent legacy bcrypt upgrade, Turnstile bypass paths, and whether failed-send or unknown-user responses reveal which emails exist.

Filing findings: for every finding you do not fix in place, create a child issue under this issue with `prep new --parent 01M5A34XDWPGKSKMTVA213DHX7 --tag security`. State the vulnerability, where it is (file and line), how to reproduce it, its severity and whether you think it blocks go-live; the acceptance names the fix and a regression test where AGENTS.md calls for one. Do not put secrets or working exploits in the record. A finding you fix in place is logged on this issue with `prep log` instead. Never leave a finding only in a report or the chat. Decision: /decisions/01M5A3G5EMHG5FRY0CANFPSXN2.md

## Open questions
