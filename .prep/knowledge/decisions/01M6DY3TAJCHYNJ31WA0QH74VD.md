---
type: decision
title: Keep the Coolify web terminal on and skip HSTS on the Coolify and GlitchTip hosts
description: Owner decision 2026-11-02 closing the last post-cutover hardening items
date: "2026-11-02"
---

Decided by the owner on 2026-11-02 after weighing both.

- Web terminal stays enabled (server setting is_terminal_enabled). It is only reachable after signing in to Coolify, and anyone who gets that far can already read every secret and deploy arbitrary code, so disabling it removes convenience for an attacker but little real protection, while costing the owner psql and container shell access. The account is protected by a passkey and TOTP (/decisions/01M6BCHET6HMA8X86M7G85YZSY.md).
- HSTS is not added on coolify.fluid-movement.de or glitchtip.fluid-movement.de. The gain is protection from a downgrade on a hostile network for a single user whose passkey is origin-bound; the cost is a change to the Traefik config shared by every site on the server. Revisit if the proxy is touched anyway, for example for the Traefik patch update.
- scripts/deploy-check.sh will therefore keep reporting the GlitchTip HSTS failure; that FAIL is accepted.
