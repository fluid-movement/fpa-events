---
title: Serve event pictures from a custom domain, not the r2.dev development endpoint
kind: manual
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - ops
---

Source: the owner, 2026-11-02, while answering the deployment owner questions (R2): the production app still serves pictures from Cloudflare's r2.dev development endpoint. Cloudflare rate-limits r2.dev and does not cache it, and says it is not for production traffic, so pictures could stall or be throttled under load.

Plan: attach a custom domain to the bucket in Cloudflare (e.g. a pictures subdomain of freestyledisc.org), then point R2_PUBLIC_URL at it. Caution: picture URLs are stored in the database as full URLs built from R2_PUBLIC_URL (src/lib/server/r2.ts, isUploadedPictureUrl in src/lib/server/eventForm.ts), so existing events keep the old r2.dev address unless the stored URLs are rewritten, and the image CSP must allow the new host. Also confirm the R2 API token is limited to Object Read and Write on this one bucket (owner question 4) and that nothing else points at r2.dev.

## Acceptance

1. [ ] The bucket has a custom domain and R2_PUBLIC_URL uses it in Coolify
2. [ ] Existing event pictures load from the new host (stored URLs rewritten or redirected) and the CSP allows it
3. [ ] The R2 API token is scoped to Object Read and Write on the one bucket

## Open questions
