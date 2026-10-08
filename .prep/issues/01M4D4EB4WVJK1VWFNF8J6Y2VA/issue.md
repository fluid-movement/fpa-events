---
title: Send security headers and a Content Security Policy
kind: code
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
tags:
  - security
---

Source: project sweep, 2026-10-08.

The app sets no security headers: no CSP (Kit's `csp` option is not configured in `svelte-options.js`), no `X-Content-Type-Options`, `Referrer-Policy`, frame protection or HSTS, unless Coolify's proxy adds some, which has not been checked. The stored XSS in schedule descriptions was fixed at the source; a CSP is the defence in depth for the next one, since the app renders organizer-written rich text.

The policy has to allow exactly what the app loads: Cloudflare Turnstile (`challenges.cloudflare.com`, script and frame), event images from `R2_PUBLIC_URL`, OpenStreetMap tiles, Photon if any call happens in the browser, and Sentry's ingest endpoint once integrated. Kit's nonce/hash mode covers its own inline hydration scripts. `Referrer-Policy` matters because invite and calendar-feed URLs carry tokens. Verify nothing on the integration suite's pages logs a CSP violation.

## Open questions
