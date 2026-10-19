---
title: Avatar image and name accept any value through Better Auth update-user and sign-up
kind: code
parent: 01M5A34YEEF5NVYZ4FXY7C25A9
tags:
  - security
priority: low
---

Finding from the input and output handling audit (01M5A34YEEF5NVYZ4FXY7C25A9), following the authorization audit's note in the work log.

**Vulnerability.** Better Auth's `POST /api/auth/update-user` (and `/sign-up/email`) let a user set their own `image`, and `name`, to any value. In better-auth 1.7.7 the update-user body is `z.record(z.string(), z.any())` (`node_modules/better-auth/dist/api/routes/update-user.mjs:12,53-60`): `name` and `image` are not even type-checked, have no length limit, and no hook in `src/lib/server/auth.ts` constrains them. The app has no avatar feature of its own, but it renders `image`: `src/routes/events/[id]/+page.server.ts:48` selects it for every publicly shown attendee, and `src/routes/events/[id]/+page.svelte:196-200` renders it as `<img src>` in the attendee dialog.

What a user can do with it:

- **Track visitors.** Point `image` at any `https:` host (CSP `img-src` allows `https:`). Everyone who opens the attendee list of an event that user attends makes a request to that host (IP, user agent, time; the Referer is origin-only thanks to the referrer policy).
- **Bloat pages.** A `data:` URI up to the 512 KB body limit is stored and shipped in every such event page's data, once per event the user RSVPs to.
- **Script: held.** `javascript:` and `http:` do nothing. Browsers never run script from `<img src>`, CSP blocks `http:` images, and an SVG `data:` image runs no script inside `<img>`.
- **Malformed names.** `name` can be any length and contain control characters. Line breaks feed 01M5A4X926P3C442RHMNW5WWJ5 (calendar line injection). A non-string value is passed straight to the adapter.

**Reproduce.** While signed in, `fetch('/api/auth/update-user', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({image:'https://example.org/pixel.gif'})})`, RSVP to an event, and open its attendee list as another visitor. I did not run this: the audit creates no accounts. It follows from the endpoint source above and the render site.

**Severity:** low (privacy and tracking, page bloat; no script execution). **Blocks go-live:** no.

## Open questions
