---
title: 'Audit input and output handling: uploads, rich text, tokens, malformed ids'
kind: manual
parent: 01M57PY1QJJ0YFYZYQR93GCF0C
tags:
  - security
priority: high
---

Part of the pre-go-live security audit (01M57PY1QJJ0YFYZYQR93GCF0C). Review the area against the code as it stands, test what can be tested, then fix each finding in place or file it as its own issue. Record non-obvious conclusions as prep findings or decisions. Brief any implementer on SvelteKit 3 idioms (see AGENTS.md).

Scope: sanitizeRichText and markdown rendering, the image upload endpoint (api/events/upload-image) and R2 handling, the calendar feed and its token, magic-link invites and the token-bearing routes, and malformed input to routes (a null byte in /events/[id] currently returns a 500 instead of a 404). Check XSS, SSRF through location or image inputs, content-type and size limits on uploads, token entropy and where tokens can leak (logs, referrers, og:url).

Filing findings: for every finding you do not fix in place, create a child issue under this issue with `prep new --parent 01M5A34YEEF5NVYZ4FXY7C25A9 --tag security`. State the vulnerability, where it is (file and line), how to reproduce it, its severity and whether you think it blocks go-live; the acceptance names the fix and a regression test where AGENTS.md calls for one. Do not put secrets or working exploits in the record. A finding you fix in place is logged on this issue with `prep log` instead. Never leave a finding only in a report or the chat. Decision: /decisions/01M5A3G5EMHG5FRY0CANFPSXN2.md

## Open questions
