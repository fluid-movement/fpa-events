---
type: decision
title: Non-page responses carry a deny-all CSP
description: 'withSecurityHeaders in src/hooks.server.ts adds content-security-policy: default-src ''none''; frame-ancestors ''none'' to every response that has none, i.e. endpoints (calendar feed, remote JSON, upload API); Kit''s page CSP is kept because the header is only added when missing. Chosen 2026-10-22 because Kit sets CSP on pages only; pinned by tests/integration/output-hardening.test.ts. An endpoint that ever serves HTML needs its own CSP.'
date: "2026-10-22"
issue: 01M5A5PQ1D4BA5BF2TCJQTRV91
scope:
  - src/hooks.server.ts
---


