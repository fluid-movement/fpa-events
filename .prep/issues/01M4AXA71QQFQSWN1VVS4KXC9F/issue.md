---
title: Choose an error-tracking service
kind: decision
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - observability
---

Source: TODO.md, "Observability".

Coolify logs are lost on redeploy, have no alerting and never see client-side errors. Decide between `@sentry/sveltekit` on Sentry's EU region with `sendDefaultPii: false` (free tier 5k events/month) and self-hosted GlitchTip on the Hetzner box (Sentry-compatible, one more container and Postgres to maintain), or neither for now. GDPR care elsewhere in the app weighs on where the data lives.

## Open questions
