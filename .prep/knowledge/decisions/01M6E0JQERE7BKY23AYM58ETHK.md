---
type: decision
title: Build with Railpack on Node 24 and no packageManager field
description: Coolify builds the app with Railpack; Node 24 is pinned by RAILPACK_NODE_VERSION
date: "2026-11-02"
supersedes:
  - 01M59PK8QMF1B7Z8BMMDMD6PH5
---

Decided by the owner on 2026-11-02 (issue 01M6B8SD126A8B8PBNRQ0A50W7), replacing the Nixpacks build and its NIXPACKS_NODE_VERSION=24 pin.

- Coolify's build pack for the event app is Railpack. Install, build and start commands stay as set in Coolify (npm install, npm run build, npm run db:migrate && node build). Node 24 is pinned by major through the RAILPACK_NODE_VERSION build variable, which replaces NIXPACKS_NODE_VERSION; the patch release still moves with the build tool.
- package.json must not carry a packageManager field. The first Railpack deploy failed at the final image step with "lstat /opt/corepack: no such file or directory": with packageManager set to npm@11.12.1 Railpack installs that npm through Corepack, and its Node 24 build image has no /opt/corepack. Removing the field (commit 445666a) fixed the build; npm is the default anyway.
- A failed build leaves the previous container serving. Each deploy shows a roughly one-minute window of intermittent 502s while Traefik drops the old container.
