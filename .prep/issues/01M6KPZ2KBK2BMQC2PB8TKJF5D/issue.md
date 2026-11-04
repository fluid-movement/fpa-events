---
title: Crew contact links
kind: code
parent: 01M5EVT0B4G7G7V5AA15ZC5BWP
depends_on:
  - 01M6KP6JPAT43YSZ3K8MTVJD9K
---

Admins add links to the crew page: a homepage link (lucide house icon) and the common platforms (Instagram, Facebook, YouTube, TikTok, Discord, WhatsApp, Telegram), each rendered with an icon. @lucide/svelte 1.x has no brand icons, so use a small SocialIcon component with inline simple-icons SVG paths (CC0) for the brands, lucide house for homepage and lucide link as the fallback for anything else. No new icon dependency. URLs validated, https only; render with rel=noopener noreferrer.

## Open questions
