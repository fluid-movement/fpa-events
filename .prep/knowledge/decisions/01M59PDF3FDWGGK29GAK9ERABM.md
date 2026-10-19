---
type: decision
title: No external uptime monitor
description: Coolify's container health check on /healthz is the only uptime wiring; no external uptime monitor or second service. Coolify already emails the maintainer when it is down, and this is not an enterprise-grade application. Decided by the user on 2026-10-19, relaxing the earlier requirement for a check outside the Hetzner box (a dead server stays silent only if Coolify's own alert is silent too).
date: "2026-10-19"
issue: 01M4NQC1N3FVFDNZDSFNPKVJW5
---


