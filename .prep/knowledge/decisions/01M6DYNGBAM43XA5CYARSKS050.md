---
type: decision
title: 'No deploy check script: headers are tested in the app, infrastructure is checked by hand'
description: Owner decision 2026-11-02 to keep the repo simple
date: "2026-11-02"
---

Decided by the owner on 2026-11-02. scripts/deploy-check.sh and docs/deploy-checks.md were created on 2026-10-22 (commit 58ab705) for the pre-go-live security audit and nothing ever ran them automatically. They are deleted (commit 295fd1c). The app's own security headers and CSP are set in src/hooks.server.ts and covered by its tests. The GlitchTip and Coolify checks (HSTS, registration settings, dashboard exposure) and the Coolify MCP review procedures are no longer kept as scripts or docs; the audit findings and decisions in prep remain the record. Supersedes the part of /decisions/01M6DY3TAJCHYNJ31WA0QH74VD.md about the script's accepted FAIL, which no longer applies. A passive header check against the live host can be rerun with plain curl -I when needed.
