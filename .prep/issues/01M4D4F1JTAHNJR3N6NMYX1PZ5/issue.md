---
title: Bring the privacy policy in line with what the app processes
kind: code
parent: 01M4D4F1CRK1FA4AZ2QDPV303T
depends_on:
  - 01M4AXA71QQFQSWN1VVS4KXC9F
tags:
  - legal
  - privacy
priority: high
---

Source: project sweep, 2026-10-08.

`src/routes/privacy-policy/+page.svelte` describes a different app in places:

- It describes a **profile image** upload that does not exist, and says names *and profile images* appear on attendee lists.
- It lists only Hetzner, Cloudflare R2 and Komoot Photon as third parties. Missing: **Mailgun** (EU, every account's email address and the verification/reset emails), **Cloudflare Turnstile** (loaded in the browser on sign-up, sign-in and reset), the **OpenStreetMap tile servers** (map tiles are fetched from the visitor's browser, which sends their IP), and the error tracker once chosen.
- Missing data: **event pictures** organizers upload, the **public attendee list** and the opt-out under Settings → Privacy, the **personal calendar feed** and its secret URL, and the server logs with user id kept for error diagnosis.
- Retention should cover the error tracker's and backups' retention once those are set.

The policy should list exactly what is processed, with legal basis and processor for each. Depends on the error-tracking choice for the tracker's section.

## Open questions
