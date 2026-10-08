---
title: Health endpoint and uptime alerting
kind: code
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
tags:
  - ops
  - observability
priority: high
---

Source: project sweep, 2026-10-08.

Error tracking reports errors the app manages to raise; it says nothing when the app is down, the container is restarting, or Postgres is unreachable. There is no health route today.

- A cheap unauthenticated endpoint (e.g. `/healthz`) answers 200 when the app can query Postgres and 503 when it cannot, without exposing anything else. It does not depend on fpa-api, Mailgun or R2, which have their own fallbacks.
- Coolify's container health check uses it, so a deploy whose container cannot reach the database is not swapped in for a working one.
- An external uptime check (Uptime Kuma as a Coolify service, or a hosted monitor) polls the public domain and alerts the maintainer by email when it is down. It must not run on the same box only, or a dead Hetzner server stays silent.

## Open questions
