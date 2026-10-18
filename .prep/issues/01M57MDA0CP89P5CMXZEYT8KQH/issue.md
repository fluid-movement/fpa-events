---
title: Alert on new GlitchTip issues by email and Telegram
kind: manual
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - observability
  - ops
priority: low
---

Split from the GlitchTip deploy issue (01M57GA36W5K9057WX1VZVG45G), 2026-10-18; not needed for launch. New GlitchTip issues should reach the maintainer without opening the UI. Add an email alert recipient on the project (GlitchTip sends through the Mailgun EMAIL_URL already set on the service) and a webhook recipient that reaches the maintainer on Telegram through a small relay on the Coolify box, for example an n8n flow posting to a Telegram bot. Keep email as the fallback. Verify with a deliberately raised test error.

## Open questions
