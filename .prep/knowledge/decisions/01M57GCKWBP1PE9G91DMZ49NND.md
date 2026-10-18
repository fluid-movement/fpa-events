---
type: decision
title: Error tracking runs on self-hosted GlitchTip
description: 'Sentry-protocol events go to a self-hosted GlitchTip on the Hetzner/Coolify box, not Sentry SaaS. Decided with the user on 2026-10-18: GlitchTip is the lightest Sentry-compatible self-hosted tracker, the official Sentry SDKs work unchanged (only the DSN differs), and it has a built-in MCP server so agents can read errors. Data stays on our server, so it is not a third-party processor, and the Hetzner VPS backups cover it.'
date: "2026-10-18"
issue: 01M4AXA71QQFQSWN1VVS4KXC9F
supersedes:
  - 01M57G90Y5GDVT34B6CNE6M6XR
outcome: true
---


