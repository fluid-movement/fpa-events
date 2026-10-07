---
title: README deploy steps and doc links are stale
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - docs
priority: low
---

The README tells people to run `npm run db:push` against production, while the project now uses generated migrations (`db:migrate`, run server-side from the Coolify terminal because the DB ports are firewalled). It also links `docs/SETUP.md`, `docs/STACK.md`, `docs/REFERENCE.md` and `docs/POSTGRES-SETUP.md`, none of which exist, and omits most env vars (`FPA_API_URL`, Mailgun, Turnstile, R2). `docs/context.md` and `docs/todo.md` describe form actions and an unbuilt `/design` route.

The README should describe the current deploy and env setup and link only files that exist; the stale docs should be updated, marked historical or removed, as the user prefers.

## Open questions

- Should `docs/context.md` and `docs/todo.md` be deleted, or kept and marked historical?
