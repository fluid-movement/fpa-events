---
title: Coolify dashboard is publicly reachable with a root web terminal enabled
kind: manual
parent: 01M5A34Z75BVD5BE4AZWWEDCPA
tags:
  - security
---

Deployment audit, 2026-10-19, parent 01M5A34Z75BVD5BE4AZWWEDCPA.

**Vulnerability.** The Coolify dashboard, which controls every app on the server, is reachable from the whole internet at https://coolify.fluid-movement.de (302 to /login, 200 login page, `<title>Coolify`). Anyone who gets in can read every secret, deploy arbitrary code and, because the server terminal is enabled (`is_terminal_enabled: true`), open a root shell on the host and in every container. Coolify v4 has had a series of serious advisories (authentication and command-injection issues), so a public login page is a real exposure even with a strong password. Its responses also send no HSTS header. Registration looks closed (/register redirects to /login), the team has one member (owner), and the API/MCP is enabled for the team. `*.fluid-movement.de` resolves to the server (wildcard DNS), so other subdomains also reach the proxy.

**Where.** Coolify instance 4.4.6 on server "localhost" (yw088ccckc0coooso0k8soko, the Hetzner host 65.21.62.132), proxy Traefik 3.7.14. Direct port 8000 and the realtime ports 6001/6002 were filtered from outside on 2026-10-19 — the exposure is through the proxy hostname, not a raw port.

**How to reproduce (class).** Passive GET of the dashboard hostname and its /login and /register paths; no login attempts were made.

**Questions for the owner (this audit cannot see them):** Is two-factor authentication on for the only account? Is the installed 4.4.6 current with Coolify's security advisories? Who holds API tokens (one is used by the agent tooling; does it need `deploy` and `read:sensitive`)? Is the web terminal needed?

**Severity.** Medium to high, depending on 2FA and patch level. Not strictly a go-live blocker for the events app, but it is the single point of compromise for all of it.

**Fix.** Restrict the dashboard by source (Hetzner firewall is not enough since it shares 443 with the apps: use a Traefik IP allow-list middleware, Cloudflare Access/Tailscale, or reach it only over an SSH tunnel), enforce 2FA, keep Coolify updated, scope API tokens to the minimum (read-only for agents), disable the terminal if unused, and add HSTS on the dashboard host.

## Open questions
