---
title: Decide whether dev goes back onto vp (Vite+)
kind: decision
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - tooling
---

Source: UPDATE.md, "Risk 1 resolved"; commit f60f331.

`vp dev` cannot run the SvelteKit 3 dev server ("The configured Vite SSR environment must be a RunnableDevEnvironment"), so `dev` and `dev:test` now run plain `vite dev`, while `test` still runs through vite-plus 0.2.x. That reverses the earlier decision that vp owns local development. Moving back means adopting vite-plus 1.0 deliberately: `vite` aliased to `@voidzero-dev/vite-plus-core`, test imports rewritten to `vite-plus/test`, and a move to vitest 5. Decide whether to do that, stay on plain vite for dev, or drop vite-plus entirely; then update the README, AGENTS.md and /architecture/build-and-deploy.md to match.

## Open questions
