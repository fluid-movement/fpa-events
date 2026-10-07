---
title: Drop the better-auth Kit override once better-auth supports SvelteKit 3
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - deps
priority: low
---

Source: UPDATE.md, "Risk 3" and "Where it landed".

better-auth 1.7.7 still declares a peer dependency on `@sveltejs/kit@^2.0.0`, so `package.json` carries an `overrides` entry pinning its Kit peer to the root Kit. Nothing breaks today; npm's resolver just needs telling. When a better-auth release peers Kit 3, upgrade better-auth and remove the override, re-running the auth integration specs.

## Open questions
