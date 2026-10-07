---
title: Pin the deploy Node version in Coolify
kind: manual
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
tags:
  - deploy
priority: high
---

Source: UPDATE.md, "Deployment notes"; /pitfalls/deploy-node-version.md.

SvelteKit 3 raised `engines.node` to `>=22.17`. Coolify's `NIXPACKS_NODE_VERSION=22` currently resolves to 22.19.0, which clears it by only two patch releases, and the major-only pin moves underneath us. `NIXPACKS_NODE_VERSION` must be pinned to an exact version (or a deliberately chosen newer major) in Coolify before going live, and the knowledge entry updated to match. With the pin in place, `engine-strict` can return to `.npmrc` if wanted.

## Open questions

- Pin an exact Node 22 release, or move the deploy to Node 24?
