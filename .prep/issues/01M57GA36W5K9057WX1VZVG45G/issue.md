---
title: Deploy GlitchTip on Coolify and enable its MCP server
kind: manual
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
tags:
  - observability
  - ops
priority: high
---

Self-host GlitchTip on the Hetzner/Coolify box (/decisions/01M57G90Y5GDVT34B6CNE6M6XR.md). In Coolify, add the GlitchTip one-click service with its own Postgres, behind HTTPS on a subdomain, with registration closed after the maintainer account exists, and email notifications through Mailgun. Create an organisation and project for the app and keep its DSN for the integration issue. Enable GlitchTip's built-in MCP server (server env var, served at /mcp) and connect it to the maintainer's agent with an API token, so agents can read issues and stack traces. The Hetzner VPS backups cover its data.

## Open questions
