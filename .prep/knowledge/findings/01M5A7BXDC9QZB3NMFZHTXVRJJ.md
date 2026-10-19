---
type: finding
title: Image and deployed Node verification is incomplete
description: 'Acceptance 1 remains unchecked. Repository has no Dockerfile, .dockerignore or nixpacks configuration, and local Docker has no identifiable fpa-events Node deployment image. Existing build/ dated 2026-10-18 was inspected as an artifact, not rebuilt: AST import inspection and source scans show no Vitest/Tinypool/oxfmt/migration imports; this does not prove the Docker filesystem lacks tools or dev dependencies. README.md:174-175 says npm run build / node build; tools/migrate/README.md:34-51 explicitly expects the repo/tool in the deployed container. Coolify search_resources(query=fpa-events) was denied: MCP tool call requires approval, but approval policy is never. No alternate access path was attempted. Cannot attest image digest, installed runtime packages, actual Node patch, build layers, or credentials in image/environment. Decision 01M59PK8QMF1B7Z8BMMDMD6PH5 records NIXPACKS_NODE_VERSION=24; all engine ranges pass local Node 24.22.0, but vite-plus/core 0.2.9 require >=24.11.0 on the Node24 line, so a major pin is not enough to prove an arbitrary cached 24.0 image works. README points to the correct decision; AGENTS.md/.npmrc still discuss the superseded Node22 build. Ask the deployment reviewer to inspect the actual image/package inventory and sanitized Node version before certifying this criterion. Legacy cleanup already belongs to 01M4B48HQM4538H4JMG7942N2Y; secret scopes/build args belong to 01M5A34Z75BVD5BE4AZWWEDCPA.'
date: "2026-10-19"
issue: 01M5A3500S3M2DBNP0EZ1EC4WK
---


