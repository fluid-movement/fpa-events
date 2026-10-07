---
type: pitfall
title: Deploy Node is older than dev Node
description: nixpacks resolves Node 22.19; dependency engine floors above it break the deploy.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:44:51Z
scope:
  - .npmrc
  - package.json
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Deploy Node is older than dev Node

Coolify builds with nixpacks at `NIXPACKS_NODE_VERSION=22`, which pins only the
major and currently resolves to **Node 22.19.0 / npm 10.9.3**. Dev machines are
usually on 22.22.x or newer.

SvelteKit 3 raised `engines.node` to `>=22.17`, two patches below what
nixpacks resolves today.

A dependency whose `engines.node` floor lies between the two installs with only
a warning, but may not run in the container. With `engine-strict=true` in
`.npmrc`, the same warning became a fatal `EBADENGINE`. That broke the
2026-09-15 deploy, when lint-staged raised its floor to `>=22.22.1`, so
`engine-strict` was removed. lint-staged and husky never run in the container.

Before pushing a dependency change, check the lockfile against the build's Node
with the `semver` snippet in `AGENTS.md` ("Quality gates"). The proper fix is
to pin `NIXPACKS_NODE_VERSION` to an exact version (or `24`) in Coolify.
`engine-strict` could come back after that.
