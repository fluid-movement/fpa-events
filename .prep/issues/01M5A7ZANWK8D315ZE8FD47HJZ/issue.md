---
title: 'Answer the deployment questions only the owner can check: firewall, backups, key scopes, proxy, GlitchTip members'
kind: manual
parent: 01M5A34Z75BVD5BE4AZWWEDCPA
tags:
  - security
---

Deployment audit, 2026-10-19, parent 01M5A34Z75BVD5BE4AZWWEDCPA. Questions only the owner can answer; the read-only Coolify/GlitchTip tools and passive checks cannot see these. Answer each in the work log (key names, yes/no, scopes — never secret values). Parent criteria 1 and 2 depend on them.

1. **Hetzner Cloud firewall.** What are the inbound rules for IPv4 and IPv6? From outside on 2026-10-19 only 22, 80 and 443 answered; 3000, 5432, 6001, 6002 and 8000 were filtered. Is SSH (22) meant to be open to the world? Is password login disabled and root login key-only? (Coolify connects to the host as root over SSH.)
2. **Hetzner VPS backups.** Decision 01M57FTWF3ZR0A2JYQ66TVTABT relies on them. Are they enabled on this server, how many are kept, and has a restore of the Postgres volume ever been tried? Who in the Hetzner project can create/download snapshots? Is 2FA on the Hetzner account?
3. **TURNSTILE_SECRET_KEY nonblank.** The key exists in Coolify (runtime and build). The audit could confirm MAILGUN_API_KEY is nonblank (the container log shows `[email] Sent ...`, which only the Mailgun path prints) but cannot see whether the Turnstile secret is nonblank. Check in Coolify that it has a value, and in the Cloudflare Turnstile dashboard that the widget's allowed hostnames include events-dev.fluid-movement.de and the cutover host events.freestyledisc.org, and that siteverify calls are being counted.
4. **R2.** Which host does R2_PUBLIC_URL point to (r2.dev, a custom domain — which one)? If it is a subdomain of the app's domain (freestyledisc.org after cutover) or of fluid-movement.de, legacy-picture finding 01M5A4X8ZCM3JDSD66MKD07F34 must be re-rated. Are R2_ACCESS_KEY_ID/SECRET an R2 API token limited to Object Read & Write on the one bucket (not an account-wide or admin token)? Are the LEGACY_R2_* keys read-only on the legacy bucket (cf. 01M5A4X9DHFRA3HK0KQB1DY1CF)?
5. **Mailgun key scope.** Is MAILGUN_API_KEY a domain sending key for the sending domain, or the account's primary API key?
6. **Proxy forwarded headers.** The app trusts HOST_HEADER/PROTOCOL_HEADER (set in Coolify) and Better Auth reads the client IP from forwarding headers. Does the Traefik proxy configuration (Servers > Proxy) contain `forwardedHeaders.insecure` or `forwardedHeaders.trustedIPs` on the http/https entry points? Without them Traefik overwrites client-supplied X-Forwarded-* headers, which is what the app assumes. Is any CDN/proxy (Cloudflare) in front of the server?
7. **GlitchTip membership.** Who are the members of organization `fpa` and with which role; is 2FA on for each; which API tokens exist (the MCP one included) and with what scopes? Registration and organization creation are off (public /api/settings/, checked 2026-10-19). What event retention is configured?
8. **Coolify traffic analytics.** The server has traffic analytics on with GeoIP, `traffic_ip_mode: full` and 395-day daily retention, i.e. full visitor IP addresses are kept for over a year. Is that intended and covered by the privacy page? (Data-exposure/GDPR question rather than an attack surface.)

## Open questions
