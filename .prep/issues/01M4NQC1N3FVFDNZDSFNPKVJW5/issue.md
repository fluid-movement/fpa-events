---
title: Wire /healthz into Coolify and an external uptime monitor
kind: manual
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
tags:
  - ops
  - observability
priority: high
---

Source: split from "Health endpoint and uptime alerting" (01M4D4EAVWJA3AB44QHZ5Q1BF6), 2026-10-11.

The app now serves `GET /healthz`: 200 `ok` when Postgres answers within 3 s, 503 `unavailable`
otherwise, with no other dependencies and nothing else exposed.

- Point Coolify's container health check at `/healthz` (port 3000), so a deploy whose container
  cannot reach the database is not swapped in for a working one.
- Set up an external uptime check (Uptime Kuma as a Coolify service, or a hosted monitor) that polls
  `https://events.freestyledisc.org/healthz` and alerts the maintainer by email when it is down. It
  must not run only on the same box, or a dead Hetzner server stays silent.

## Open questions
