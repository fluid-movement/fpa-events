---
type: decision
title: The event hero layout is picked from the picture's stored size, with no organizer override
description: 'The event page chooses its hero layout itself from the picture''s stored width and height; organizers get no Auto/Banner/Portrait setting and no heroLayout column. Every picture''s size must be known when the page renders, so the server emits the right layout and real width/height attributes and nothing jumps when the image loads (the user: knowing the image size is a must, that is frontend best practice). Pictures uploaded in the app already store their size; the legacy migration records it too. Decided by the user on 2026-10-19.'
date: "2026-10-19"
issue: 01M4AXA74BJVZQM13YPT1KMJ9Q
---


