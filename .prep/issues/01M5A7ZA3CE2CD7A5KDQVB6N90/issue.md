---
title: Legacy Prod Database is published on public port 5432 without TLS, guarded only by the Hetzner firewall
kind: manual
parent: 01M5A34Z75BVD5BE4AZWWEDCPA
tags:
  - security
---

Deployment audit, 2026-10-19, parent 01M5A34Z75BVD5BE4AZWWEDCPA.

**Vulnerability.** The legacy Laravel app's Postgres ("Prod Database", the source of the legacy import, holding every legacy user's email and bcrypt password hash) is configured in Coolify as a *public* database: `is_public: true`, `public_port: 5432`, `enable_ssl: false`, superuser `postgres`. Coolify publishes that port on all host interfaces through Docker, which bypasses a host firewall such as ufw. The only thing keeping it off the internet is the Hetzner Cloud firewall in front of the server. The Codex run's TCP connect to 5432 on the server's IPv4 and IPv6 address timed out, so it looks filtered today; that is one control, and any firewall change, a second network interface or a migration to another host would expose a superuser login without TLS to password guessing.

**Where.** Coolify standalone database s88c8cos8gkoggk8w0cckos0 ("Prod Database", project fpa-events, image postgres:17-alpine). Compare the new app's database nr234g3tapphcp539wvuocvp ("events-postgres"): `is_public: false`, mapped only to `127.0.0.1:5501`, which is the right shape. The Player Profiles DB is likewise loopback-only.

**How to reproduce (class).** `get_database` on the resource shows the flags. An external TCP connect to the server on 5432 shows whether the outer firewall currently filters it (it did on 2026-10-19). No login was attempted.

**Severity.** Medium (high-value data, single control). Not a blocker for the new app's go-live, but it should be closed before the import runs, and in any case it goes away when the legacy app is decommissioned (01M4B48HQM4538H4JMG7942N2Y).

**Fix.** Untick "Make it publicly available" on the legacy database (the import uses the internal URL per tools/migrate/README.md:41; use an SSH tunnel or a 127.0.0.1 mapping like the other databases for any ad-hoc access). Confirm the import still reaches it over the internal network.

## Open questions
