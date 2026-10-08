---
title: Bring the privacy policy in line with what the app processes
kind: code
parent: 01M4D4F1CRK1FA4AZ2QDPV303T
tags:
  - legal
  - privacy
priority: high
---

Source: project sweep, 2026-10-08.

`src/routes/privacy-policy/+page.svelte` describes a different app in places:

- It describes a **profile image** upload that does not exist, and says names *and profile images* appear on attendee lists.
- It lists only Hetzner, Cloudflare R2 and Komoot Photon as third parties. Missing: **Mailgun** (EU, every account's email address and the verification/reset emails), **Cloudflare Turnstile** (loaded in the browser on sign-up, sign-in and reset), the **OpenStreetMap tile servers** (map tiles are fetched from the visitor's browser, which sends their IP).
- Missing data: **event pictures** organizers upload, the **public attendee list** and the opt-out under Settings → Privacy, the **personal calendar feed** and its secret URL, and the server logs with user id kept for error diagnosis.

The policy should list exactly what is processed, with legal basis and processor for each.

- **Photon** is called from the visitor's browser, so Komoot receives their IP, not only the search text the policy claims.
- The **Cookies** section should also name the `sidebar:state` localStorage entry. No cookie banner is needed: the session cookie and that UI preference are strictly necessary (TDDDG § 25(2), ePrivacy Art. 5(3)), Turnstile, the tile servers and Photon store nothing, and nothing tracks. Keep it that way; adding analytics would change this.

User, 2026-10-08: keep the policy short and in plain language, listing only what is required. The FPA (a US nonprofit) is the controller; the GDPR applies through Art. 3(2). No EU representative is named (see the operator issue).

User, 2026-10-08: update the policy now rather than wait for the error-tracking choice. The error tracker's section and the backup retention are added by the issues that introduce them (Sentry integration, database backups), so this issue no longer depends on the decision.

## Open questions
