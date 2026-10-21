---
title: Record picture sizes in the legacy migration
kind: code
parent: 01M4B368HR728N7P81MK1DFQCR
tags:
  - feature
---

Source: the user, 2026-10-19, while settling the event hero layouts (01M4AXA74BJVZQM13YPT1KMJ9Q; decision /decisions/01M5A9DJJJ9FYA51X2AEM0BFDY.md). The event page picks its hero layout from the picture's stored width and height and must know them when it renders, so the image does not jump when it loads.

The legacy import (tools/migrate, pictures in tools/migrate/src/pictures.ts) copies each event picture to R2 but leaves events.picture_width and picture_height null, so every migrated event would fall back to the plain layout. The import should read each picture's width and height from the image it already downloads and store them on the event. A picture whose size cannot be read keeps null sizes and is listed in the migration report.

Events already imported (events-dev, or production if the final migration runs before this lands) need the same sizes filled in: a re-run of the import or a one-off backfill that reads the pictures from R2, whichever the import's idempotency makes simpler.

This should land before the final legacy migration (01M4B48HENZTKHQ88QZ83E0EBH), and touches the same code as audit finding 01M5A4X8ZCM3JDSD66MKD07F34 (check picture content type), which may be done together. Reading the size from the file header is enough; avoid decoding whole images.

## Open questions
