---
title: Security audit before go-live
kind: manual
parent: 01M4B368HR728N7P81MK1DFQCR
tags:
  - security
priority: high
---

Source: the user, 2026-10-18: another security audit is needed before go-live (the GlitchTip live test showed query values leaking into error reports, which would be an attack vector; see the redaction issue).

The earlier hardening work covered the Content Security Policy and security headers. Before the domain switches, review the whole app once more for ways data or access could leak or be abused.

Settled with the user on 2026-10-19:

- Scope: the app code and the deployment, split into seven area children.
- Who runs it: one Opus agent per area, at most two at a time. The audit is read-only and files every finding and every verified defense as a child issue of its area (decision /decisions/01M5A44HQ85VNXP0CBCKW60592.md). Fixes and regression tests are implemented afterwards through the normal workflow.
- Blocking: the user decides per finding; the auditor states severity and a recommendation.
- Order: the untrusted-upstream-data area first, because the final legacy migration is next.

## Open questions
