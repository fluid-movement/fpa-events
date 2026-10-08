---
title: Link previews for shared event pages
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - feature
  - seo
priority: low
---

Source: project sweep, 2026-10-08.

Events are mostly found through links shared in chats and social media, but pages set only a `<title>`: no meta description, no Open Graph or Twitter card tags. A shared event link shows no picture, date or place. Event pages should emit `og:title`, `og:description` (date and place), `og:image` (the event picture) and `og:url`; other pages a site-wide default.

## Open questions
