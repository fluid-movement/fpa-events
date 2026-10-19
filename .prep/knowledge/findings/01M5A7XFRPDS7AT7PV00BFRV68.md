---
type: finding
title: The deploy installs Better Auth 1.7.8 from the lock; local 1.7.7 drift does not overturn the auth audit, but cookie code changed
description: 'Local node_modules (.package-lock.json 2026-10-18 16:03) predates commit 9e6b14b (18:00) that moved better-auth to ^1.7.8, so 13 installed packages lag package-lock.json (better-auth and 6 @better-auth/* adapters 1.7.7 vs 1.7.8, @better-auth/utils 0.4.2 vs 0.5.0, better-call 1.4.0 vs 1.4.2, nanostores, set-cookie-parser, zod). package.json and both locks are in sync (every range satisfied, root entries equal), so nixpacks'' npm ci installs exactly the lock: the deploy runs 1.7.8, not what the auth audit probed. Diffing the 1.7.8 / better-call 1.4.2 / utils 0.5.0 tarballs (npm pack into scratch) against the installed copies: reset-password now consumes the token inside a transaction with the password write; change-password with revokeOtherSessions is transactional; magic-link and email-otp changed but the app only loads the captcha plugin, which did not change; captcha and rate-limiter files are unchanged; utils random still uses getRandomValues; better-call''s cookie serialisation was refactored (same __Secure-/__Host- semantics on read). Session revocation on reset is still gated by emailAndPassword.revokeSessionsOnPasswordReset, so finding 01M5A6NTZZ25Z46EJQ6F23G7B1 holds on 1.7.8. Conclusion: no auth conclusion is overturned, but cookie-attribute and reset-flow observations from the auth lock-in (01M5A6S4EXZY5WE590R1XFP6GS) were made on older code and should be rerun on a clean npm ci tree when that lock-in is implemented. npm outdated also shows better-auth 1.7.11 available; npm audit lists no Better Auth advisory.'
date: "2026-10-19"
issue: 01M5A3500S3M2DBNP0EZ1EC4WK
---


