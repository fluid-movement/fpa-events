---
title: Switch the Coolify build pack from Nixpacks to Railpack
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - deployment
priority: low
---

Nixpacks is deprecated and Railpack is the recommended replacement. The event app (Coolify app tfneo1jlnfvhzyshhwcovplf) builds with the nixpacks build pack and NIXPACKS_NODE_VERSION=24 (decision 01M59PK8QMF1B7Z8BMMDMD6PH5); start command is 'npm run db:migrate && node build'. Move the build to Railpack without changing runtime behaviour. Do it after the cutover (01M4B48HMSZ3XMXPW8MKQJMP3T) unless the owner says otherwise, so the build does not change mid-migration. Open points to settle: Railpack's Node version variable (replaces NIXPACKS_NODE_VERSION), whether tools/migrate still ships in the image (migration runbook depends on it until cutover), build-time vs runtime variables (PUBLIC_*, SENTRY_*), and the Node floor issue for vite-plus (>=24.11.0) in AGENTS.md.

## Open questions
