---
type: finding
title: Authentication deployment checks are partial under the passive-only boundary
description: Passive GETs on events-dev.fluid-movement.de returned /sign-in 200 with a Turnstile container, /api/auth/get-session 200 null with no-store, and no session cookies; HSTS and strict-origin-when-cross-origin held. The same new-app paths on events.freestyledisc.org returned 404. HTTPS cookie flags and 7-day lifetime were checked in an isolated handler and source, not live issuance. Installed limiter defaults are production-only memory storage, 100/10s general, 3/10s sign-in/signup/change-password and 3/60s reset/resend; offline enabled-rule probes returned 429 on the fourth call across host addresses in one IPv6 /64. Prior deployed /64 observation is issue 01M4D4EAZ03YB416EKZJDSRF1K and decision 01M5A2XJC28ZGAW405A88YKK8E. No current live threshold, cookie renewal or adversarial forwarding-header probe was permitted. Widget presence proves only the public key, not the secret or Cloudflare hostname settings. package.json requests ^1.7.8 but installed better-auth/core report 1.7.7; deployment/dependency reviewers must reconcile the executable version. Parent criterion 1 stays unchecked; lock-in 01M5A6S4EXZY5WE590R1XFP6GS records the full scope and limits.
date: "2026-10-19"
issue: 01M5A34XDWPGKSKMTVA213DHX7
---


