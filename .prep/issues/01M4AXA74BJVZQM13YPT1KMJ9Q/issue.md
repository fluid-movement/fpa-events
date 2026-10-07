---
title: Event hero layouts for banner and portrait images
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - feature
  - ui
---

Source: TODO.md, "Phase 5 — event hero layouts".

`events/[id]/+page.svelte` renders one fixed `object-cover` hero, so portrait posters are cropped to a strip. The page should pick a `banner` layout (ratio ≥ 1.4, full width) or a `split` layout (details left, image right at its natural ratio) from the stored `pictureWidth`/`pictureHeight`, both collapsing to one uncropped stack below `md:`. Organizers can override with a nullable `heroLayout` column (`banner | split | null`, null = auto) via Auto/Banner/Portrait radio cards under the cover-image field, and `ImageUpload.svelte` tells them which crops to upload. The migration runs server-side from the Coolify terminal; the seed covers the new column.

## Open questions
