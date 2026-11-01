---
title: Let users change their email address in their profile
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - feature
---

Source: the owner, 2026-11-01, right after go-live. Investigate letting a signed-in user change the email address on their profile. Open questions to settle before defining: does Better Auth's changeEmail flow fit (verify the new address, notify the old one), what happens to legacy users whose address is wrong or dead, whether the change must be re-verified before it takes effect, and how it interacts with email verification and organizer magic-link invites.

## Open questions
