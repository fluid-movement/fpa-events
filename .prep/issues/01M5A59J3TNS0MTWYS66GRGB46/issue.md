---
title: The image upload endpoint has no limit and its unused uploads are never deleted
kind: code
parent: 01M5A45SRVRT71JY7RKBHSZBWE
tags:
  - security
---

Found by the data-exposure and abuse audit (01M5A45SRVRT71JY7RKBHSZBWE), 2026-10-19; first noted by the authorization audit (see this audit's work log).

## Vulnerability

`POST /api/events/upload-image` (`src/routes/api/events/upload-image/+server.ts` lines 13-33) lets any signed-in user put an image of up to 10 MB into the public R2 bucket, as often as they like. Nothing ties the upload to an event or to the user: `uploadImage` (`src/lib/server/r2.ts` line 38) writes `events/<ulid>.<ext>` and returns its public URL. There is no per-user or per-IP limit, no Turnstile token (unlike `createEvent`/`updateEvent`), and objects that never end up on an event are never deleted (`releasePicture` only removes pictures an event used to hold).

Effect: one verified account can fill the bucket and use it as free public image hosting under our domain's bucket URL, and every abandoned upload in normal use (picking a picture, then cancelling) leaks an object forever.

Cross-site use is not possible: Kit's form-content-type Origin check returns 403 for a cross-site multipart POST (verified against the production build), and the Lax session cookie is not sent cross-site.

## How to reproduce

Signed in, POST a small PNG as `file` (multipart) to `/api/events/upload-image` in a loop from the same origin: every request returns a fresh public URL; nothing refuses after N requests and nothing removes the objects.

## Severity

Low to medium: cost and abuse (storage, egress, hosting of arbitrary images), not a data leak. It needs a verified account, which needs a Turnstile-protected sign-up and a real inbox.

Blocks go-live: no, in my view; worth doing soon after.

## Fix direction

A per-user upload limit (for example N uploads per hour, counted in the database or memory, answered with 429), and a sweep that deletes `events/` objects older than a day that no event references. Recording the uploader's id with the key would make both straightforward.

## Open questions
