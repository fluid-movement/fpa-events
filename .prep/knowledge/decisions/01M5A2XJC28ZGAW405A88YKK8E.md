---
type: decision
title: Better Auth needs no advanced.ipAddress setting
description: 'Behind Coolify''s proxy, the session.ip_address Better Auth stores is the visitor''s real address: on 2026-10-19 events-dev recorded 2001:0a61:04be:7f01:: for a visitor whose IPv6 address was 2001:a61:4be:7f01:25a8:5756:c07c:44f1. Better Auth truncates IPv6 addresses to the /64 prefix, so the lower 64 bits are always zero and users on one /64 share a rate-limit bucket. No Cloudflare is planned in front, so the default header handling stays. Revisit if a CDN or another proxy is ever added.'
date: "2026-10-19"
issue: 01M4D4EAZ03YB416EKZJDSRF1K
---


