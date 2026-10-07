---
title: README deploy steps and doc links are stale
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - docs
priority: low
---

The README tells people to run `npm run db:push` against production, while the project now uses generated migrations (`db:migrate`, run server-side from the Coolify terminal because the DB ports are firewalled). It still shows a `docs/` folder in the project tree and links `docs/SETUP.md`, `docs/STACK.md`, `docs/REFERENCE.md` and `docs/POSTGRES-SETUP.md`; `docs/` was retired into prep on 2026-10-07, so none of those exist. It omits most env vars (`FPA_API_URL`, Mailgun, Turnstile, R2; now declared in `src/env.ts`), still describes `vp dev` and `svelte.config.js`, and predates SvelteKit 3.

The README should describe the current setup, deploy and env vars, point to `.prep/knowledge/overview.md` for project knowledge, and link only files that exist.

## Open questions
