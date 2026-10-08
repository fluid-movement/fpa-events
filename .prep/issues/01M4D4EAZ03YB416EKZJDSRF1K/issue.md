---
title: Verify Better Auth sees the real client IP behind the proxy
kind: manual
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
tags:
  - deploy
  - auth
priority: high
---

Source: project sweep, 2026-10-08.

Better Auth's built-in rate limiter (in-memory, on by default in production) and the session's stored IP address key on the client IP, which it reads from forwarding headers. Behind Coolify's proxy (and Cloudflare, if the domain is proxied there) a misread header makes every visitor share the proxy's IP: a handful of failed sign-ins from anyone would then rate-limit sign-in for everyone, which on cutover day, when every user signs in again, is exactly when it would bite.

On the deployed instance, confirm which IP Better Auth records for a session (the `session.ip_address` column) is the visitor's, and if not, set `advanced.ipAddress` in `src/lib/server/auth.ts` to the header the proxy actually provides. Check together with the request-origin issue, since both depend on the same proxy headers.

Knowledge: /components/auth.md.

## Open questions
