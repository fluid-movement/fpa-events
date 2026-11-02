---
type: decision
title: Keep Coolify traffic analytics with anonymized IPs and describe it in the privacy policy
description: Owner decision 2026-11-02 on the traffic analytics setting
date: "2026-11-02"
---

Decided by the owner on 2026-11-02 (owner question 8, issue 01M5A7ZANWK8D315ZE8FD47HJZ). The owner wants the traffic analytics, so Coolify's traffic analytics stays on with Client IP addresses set to Anonymized (/24 IPv4, /48 IPv6), instead of the default full IPs that were kept for 395 days. Retention is unchanged (30 days hourly, 395 days daily). The privacy policy's Server logs section now says the hosting proxy keeps anonymized traffic statistics and a short-lived access log. The Traefik access log itself still holds full IPs and rotates by size, not time (20 MB, 5 compressed copies); if the policy ever needs a hard retention promise, cap that rotation. The Coolify terminal stays on and HSTS stays off, as decided in /decisions/01M6DY3TAJCHYNJ31WA0QH74VD.md.
