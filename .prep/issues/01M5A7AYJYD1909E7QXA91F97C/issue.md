---
title: Production accepts missing CAPTCHA and mail keys, bypassing checks and logging auth links
kind: code
parent: 01M5A34Z75BVD5BE4AZWWEDCPA
tags:
  - security
priority: low
---

Deployment audit, 2026-10-19, parent 01M5A34Z75BVD5BE4AZWWEDCPA.

Vulnerability: a production deployment with an omitted or empty TURNSTILE_SECRET_KEY silently removes CAPTCHA from every protected auth endpoint and accepts event creation/edit CAPTCHA checks without a token. An omitted or empty MAILGUN_API_KEY sends reset and verification bearer links, with recipient addresses, into application logs instead of delivering mail. Neither fallback is restricted to local development/test. This is a reproducible configuration hazard, not evidence that the deployed keys are currently blank. Ordinary password, email-verification and authorization checks remain in force.

Where: src/env.ts:7-18,33-46 deliberately accepts absent values; src/lib/server/auth.ts:9-25 drops the CAPTCHA plugin; src/lib/server/turnstile.ts:15-18 returns true for a missing secret; src/lib/server/email.ts:20-28,38-42 logs the auth URL. README.md:36-38 describes the general fallback without a production boundary. The Mailgun fallback is distinct from the Drizzle query-parameter log leak already filed as 01M5A5KMZWSA69YYR47S0R916E. Authentication lock-in 01M5A6S4EXZY5WE590R1XFP6GS documents the blank-secret behavior and defers live configuration checking, but asks for no fix to this production boundary.

Reproduction class: run the actual helper unit tests with NODE_ENV=production, a separate scratch Vitest configuration, and mocked private env exports containing no Mailgun/Turnstile keys. Existing turnstile.test.ts accepted an absent challenge without any fetch; existing email.test.ts recorded synthetic reset/verification links in console calls. All 62 tests across five selected files passed in this setup. Source inspection confirms auth.ts also omits the plugin independently of build/runtime mode. No server, database writes, accounts, provider requests or real email were used. The tests use synthetic links only. Coolify read-only resource discovery was approval-blocked, so current key presence/nonblank status is unknown; a visible Turnstile widget proves only the public site key.

Severity: medium, conditional on deployment misconfiguration. CAPTCHA failure increases abuse exposure; auth links in logs broaden who can use those credentials and break delivery. Go-live recommendation: verify nonblank correctly scoped runtime keys before cutover. This code hardening is non-blocking if that configuration is verified; do not call the live service vulnerable without that evidence. Missing required production keys should block serving the affected flows.

Fix: make development fallbacks explicitly local/test-only. At production runtime, reject incomplete mail/CAPTCHA configuration before an affected request can bypass verification or log a bearer link, using a clear diagnostic containing key names only. Preserve intentional local/test fallback and Kit build-time evaluation. Avoid requiring provider secrets merely to compile the app.

## Open questions
