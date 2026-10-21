---
type: decision
title: Failed email sign-ins wait out a fixed 1 s floor
description: Every 401 from POST /api/auth/sign-in/email is held to at least 1000 ms (src/lib/server/sign-in-timing.ts) so unknown accounts, scrypt users and legacy bcrypt users up to cost 13 answer alike. The floor is a constant, never derived from the email, password or stored work factor; successes, 403/429 and captcha failures are not delayed. Chosen 2026-10-21 over rehashing or constant-time verification because it needs no data change; legacy bcrypt cost 14 stays distinguishable (tools/security/README.md).
date: "2026-10-21"
issue: 01M5A6NVDC0PNBFD30SP8KDQTV
scope:
  - src/lib/server/sign-in-timing.ts
---


