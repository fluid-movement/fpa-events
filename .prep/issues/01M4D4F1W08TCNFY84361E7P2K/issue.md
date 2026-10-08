---
title: Orphaned uploads and unbounded image uploads
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - r2
priority: low
---

Source: project sweep, 2026-10-08.

`POST /api/events/upload-image` stores a file in R2 as soon as it is picked, before the event form is saved. An upload that is abandoned or replaced in the picker is never deleted. Any signed-in user can also upload 10 MB files without limit. Neither is a launch risk at this audience's size; a periodic sweep of `events/` objects no event references, and a per-user upload rate limit, would bound both.

## Open questions
