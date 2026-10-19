---
title: Event hero layouts for banner and portrait images
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - feature
  - ui
---

Source: TODO.md, "Phase 5 — event hero layouts"; requirement settled with the user on 2026-10-19 (decision /decisions/01M5A9DJJJ9FYA51X2AEM0BFDY.md).

`events/[id]/+page.svelte` renders one fixed `object-cover` hero, so portrait posters are cropped to a strip. The page picks the layout itself from the event's stored `pictureWidth`/`pictureHeight`; organizers have no setting for it.

- **Banner** when width / height is 1.4 or more: the picture spans the full width above the event details, uncropped.
- **Split** when the ratio is below 1.4 (portraits, squares, 4:3 photos): details on the left, the picture on the right at its natural ratio, uncropped.
- **Below `md:`** both become one column. A banner stays above the details. A split picture moves below the title and date block, so the event name, date and RSVP stay above the fold; it is shown whole (object-contain), capped at about 70% of the viewport height, with a neutral background filling the unused width.
- **No layout shift:** the image always carries its real `width` and `height` attributes (or an equivalent aspect ratio), so the browser reserves its space before it loads.
- **Unknown size** (both columns null, or a size that cannot be valid such as zero): fall back to the one-column layout with the picture below the title block, uncropped and capped as above. This is a safety net; the legacy migration records sizes (separate issue).

The layout choice is a small pure function (size in, `banner | split | unknown` out) with a unit test covering the threshold, the edges and missing or invalid sizes, as AGENTS.md asks for logic that can be wrong. No schema change, no migration and no seed change are needed: the columns exist and the seed already has a 1600×700 picture; add a portrait picture to the seed only if one is needed to see the split layout locally.

Out of scope: organizer override, crop guidance in ImageUpload, recording sizes in the legacy migration.

## Open questions
