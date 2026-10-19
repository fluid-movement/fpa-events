---
type: finding
title: Authentication response enumeration held except mixed legacy hash timing
description: 'Unknown/wrong sign-in returned identical 401 JSON; known/unknown reset requests returned identical 200 JSON; anonymous verification resends returned identical JSON and 503/505 ms locally because the installed library applies a 500 ms floor. Signup source uses a synthetic duplicate response and dummy scrypt work. Mailgun rejection was simulated against original email source with imports stubbed: delivery errors were caught, not propagated to auth responses. Mixed bcrypt/scrypt failures remain distinguishable by work factor: 12-sample local medians 58.4 ms unknown scrypt, 57.7 ms scrypt verification, 70.3 ms bcrypt10, 278.5 ms bcrypt12. Filed low-severity 01M5A6NVDC0PNBFD30SP8KDQTV; production hash costs and network enumeration accuracy were not measured. Known-reset insert versus unknown-reset dummy read may retain small DB timing differences; the audit does not claim exact timing equality.'
date: "2026-10-19"
issue: 01M5A34XDWPGKSKMTVA213DHX7
---


