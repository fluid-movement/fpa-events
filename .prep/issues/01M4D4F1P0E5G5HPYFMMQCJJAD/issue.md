---
title: Keep legacy Laravel URLs working after the switch
kind: manual
parent: 01M4B48HBQAD5X06ECPSJVFGG6
tags:
  - cutover
priority: high
---

Source: project sweep, 2026-10-08.

Links to events.freestyledisc.org are already out in the world: event pages shared in chats and social media, bookmarks, the links inside past emails, and search-engine results. Event IDs migrate 1:1 (both apps use ULIDs), so an event link survives if the path shape is the same; renamed pages (`/user/attending` → `/attending`, `/user/organizing` → `/organizing`, and the auth pages) would 404 after the switch.

List the Laravel app's public routes (`php artisan route:list` on the legacy box), compare them with the new routes, and add permanent redirects for every one that changed and is worth keeping. Verify a sample of real old links against the deployed app before switching the domain.

## Open questions

- Which Laravel routes exist, and which paths differ from the new app?
