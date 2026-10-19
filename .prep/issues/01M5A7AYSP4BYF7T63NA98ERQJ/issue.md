---
title: GlitchTip admin HTTPS responses omit HSTS
kind: code
parent: 01M5A34Z75BVD5BE4AZWWEDCPA
tags:
  - security
priority: low
---

Deployment audit, 2026-10-19, parent 01M5A34Z75BVD5BE4AZWWEDCPA.

Vulnerability: the public GlitchTip administrative origin does not advertise Strict-Transport-Security, so its HTTPS responses do not teach browsers to require HTTPS on subsequent visits. The HTTP redirect alone does not provide that protection against a network attacker on an HTTP-first visit. This is a transport-hardening gap; no credential theft, authentication bypass or access to stored events was observed. Browser HTTPS-only mode or a separately established parent/preload policy can mitigate the risk; these were not assumed.

Where: external GlitchTip service/proxy at https://glitchtip.fluid-movement.de/ and /login, observed 2026-10-19. There is no corresponding GlitchTip configuration file/line in this repository. src/hooks.server.ts:48 sets HSTS only on fpa-events responses and cannot protect the separate GlitchTip origin. The previously completed setup issue is 01M57GA36W5K9057WX1VZVG45G.

Reproduction class: passive ordinary GETs to the HTTPS root and login page both returned 200 with no Strict-Transport-Security header. HTTP root returned 302 to HTTPS. HTTPS responses had CSP, X-Frame-Options: DENY, nosniff and Referrer-Policy: same-origin. A passive GET to the parent https://fluid-movement.de/ returned 302 without HSTS too; that is not a comprehensive preload/inheritance assessment. No login, malformed requests or downgrade attack was attempted. No GlitchTip MCP is available, so settings, memberships and stored events were not inspected.

Severity: low. Go-live recommendation: non-blocking for the events cutover; enable HSTS for the error-tracker admin origin as a follow-up. Use HTTPS directly in the meantime.

Fix: configure HSTS on the GlitchTip HTTPS origin, either at its proxy or in its supported service settings, ensuring TLS/proxy scheme handling is correct. Use a positive reviewed max-age; do not impose includeSubDomains on sibling services without reviewing them. Retain the HTTP-to-HTTPS redirect. Django describes the defense at https://docs.djangoproject.com/en/5.2/ref/middleware/#http-strict-transport-security .

Regression: record a repeatable passive deployment check for the root and login response headers, including HTTPS redirect and nonzero HSTS. This is an infrastructure check against the deployed service, not a browser/DB integration test for a local Svelte component; no app rendering test is appropriate under AGENTS.md.

## Open questions
