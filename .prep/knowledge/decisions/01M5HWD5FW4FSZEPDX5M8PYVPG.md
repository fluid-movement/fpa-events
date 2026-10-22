---
type: decision
title: App secrets are runtime-only Coolify variables
description: 'Made by the owner on 2026-10-22: every app secret, including DATABASE_URL, BETTER_AUTH_SECRET and BETTER_AUTH_URL, is a runtime-only Coolify variable. The only build variables are NIXPACKS_NODE_VERSION, PUBLIC_GLITCHTIP_DSN, PUBLIC_TURNSTILE_SITE_KEY and SENTRY_URL, plus SENTRY_AUTH_TOKEN, which is build-only. The reason: build arguments reach every dependency''s install script and the image history. So npm run build must succeed with no secrets, and code must not read one at import except behind ''building''. Production refuses to start without its keys (production-config.ts).'
date: "2026-10-22"
issue: 01M5A7ZA0AMVQW9D2J1FY6ANW4
scope:
  - src/lib/server/**
---


