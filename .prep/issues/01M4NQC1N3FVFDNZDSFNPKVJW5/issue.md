---
title: Wire /healthz into Coolify's container health check
kind: manual
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
tags:
  - ops
  - observability
priority: high
---

Source: split from "Health endpoint and uptime alerting" (01M4D4EAVWJA3AB44QHZ5Q1BF6), 2026-10-11.

The app serves `GET /healthz`: 200 `ok` when Postgres answers within 3 s, 503 `unavailable` otherwise, with no other dependencies and nothing else exposed.

Point Coolify's container health check at `/healthz` (port 3000), so a deploy whose container cannot reach the database is not swapped in for a working one.

Scope narrowed 2026-10-19: no external uptime monitor. Coolify already emails the maintainer when it is down, and the user does not want a second service (/decisions/01M59PDF3FDWGGK29GAK9ERABM.md).

## Open questions
