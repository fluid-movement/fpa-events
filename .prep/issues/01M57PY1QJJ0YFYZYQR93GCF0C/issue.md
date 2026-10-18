---
title: Security audit before go-live
kind: manual
parent: 01M4B368HR728N7P81MK1DFQCR
tags:
  - security
priority: high
---

Source: the user, 2026-10-18: another security audit is needed before go-live (the GlitchTip live test showed query values leaking into error reports, which would be an attack vector; see the redaction issue).

The earlier hardening work covered the Content Security Policy and security headers. Before the domain switches, review the whole app once more for ways data or access could leak or be abused, and fix or file what turns up.

## Open questions

- Scope: only the app code (authz, remote functions, uploads, invite and calendar tokens, rate limiting, error reports), or also the deployment (Coolify, Hetzner firewall, GlitchTip access, secrets in env)?
- Who runs it: a review pass by agents (for example the security-review skill per area), an external tool, or both?
- Which findings block go-live, and which become follow-up issues?
