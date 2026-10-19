---
title: Picture migration republishes legacy objects without checking their content type
kind: code
parent: 01M5A45SJ0DTHEX1G0R86JKXEJ
tags:
  - security
priority: low
---

Finding from the untrusted-upstream-data audit (01M5A45SJ0DTHEX1G0R86JKXEJ).

**Vulnerability.** `npm run migrate:pictures` copies every legacy object named in `events.picture` into the target bucket with the legacy object's own `ContentType` (`tools/migrate/src/pictures.ts:110-118`), and `migrate.ts:163` points `events.picture` at it. Nothing checks the type. The app's own upload path only accepts `image/jpeg|png|webp|gif|avif` (`src/routes/api/events/upload-image/+server.ts:11`) and has an integration test rejecting SVG with script (`tests/integration/event-picture.test.ts:62`); the migration bypasses that allowlist, so a legacy SVG or HTML object would be republished, publicly served, from the target bucket's public URL with an active content type.

Related, same area: `pictures.ts:86` skips blank `picture` values (`btrim(picture) <> ''`), but `migrate.ts:163` only checks truthiness, so a whitespace-only legacy value becomes a picture URL pointing at the bucket root (broken image; `releasePicture` would later try to delete a key made of whitespace).

**Reproduce.** Put an object with `Content-Type: image/svg+xml` (or `text/html`) in a scratch legacy bucket, reference it from a legacy event, run both steps, and fetch the event's picture URL: it is served with that content type.

**Impact depends on the public bucket host.** In dev it is an `r2.dev` host, a different site from the app, so script there cannot reach the app's cookies. I could not check what host production uses. If it is a subdomain of the app's domain, the impact grows (same-site script).

**Severity.** Low (requires a non-image object in the legacy bucket, which the legacy app's own validation should have prevented).

**Blocks go-live?** No, but it is cheap to fix before the final migration.

## Open questions
