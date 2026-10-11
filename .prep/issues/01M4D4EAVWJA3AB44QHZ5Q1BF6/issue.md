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

A cheap unauthenticated endpoint (`/healthz`) answers 200 when the app can query Postgres and 503 when it cannot, without exposing anything else. It does not depend on fpa-api, Mailgun or R2, which have their own fallbacks. A hung database must still get a timely 503.

Wiring it into Coolify's health check and an external uptime monitor is tracked separately as a manual issue.

## Open questions
