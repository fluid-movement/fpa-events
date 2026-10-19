---
type: decision
title: Pin the deploy to Node 24
description: NIXPACKS_NODE_VERSION is pinned to 24 in Coolify, replacing the earlier decision to pin an exact Node 22 release. It already builds and runs on 24 (deploy 0wotsqcti… of 2026-10-18 passed its /healthz check) and the dev machines run Node 24. 24 is a major-only pin, so the patch release moves with the nixpacks resolver; SvelteKit 3 needs >=22.17, which every Node 24 clears. Decided by the user on 2026-10-19.
date: "2026-10-19"
issue: 01M4B3VD4SSX3H3A4JRGGHTZEB
supersedes:
  - 01M57G911WCPZM7AGP2Q3ZJQ30
---


