---
type: decision
title: Request origin comes from proxy headers, not paths.origin
description: 'adapter-node 6 ignores ORIGIN, and nothing sets paths.origin. The deployed app instead takes its public https origin from the proxy via the HOST_HEADER and PROTOCOL_HEADER env vars set in Coolify. Verified on events-dev.fluid-movement.de on 2026-10-19: sign-in, password reset, email verification and an RSVP through a remote-function form all succeeded, so the cross-site check accepts the requests. Re-check after the switch to events.freestyledisc.org, since the headers are per-app Coolify env.'
date: "2026-10-19"
issue: 01M4B3VD0TVSKJ5ST77VB0BXEX
---


