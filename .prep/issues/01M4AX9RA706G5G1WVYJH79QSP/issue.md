---
title: Invite links lose the user after sign-in
kind: code
parent: 01M4B36FYKP8DMCMD4SZGHAK3S
tags:
  - bug
priority: high
---

`/invite/[token]` sends signed-out visitors to `/sign-in?redirect=/invite/<token>`, but `src/routes/sign-in/+page.svelte` never reads `redirect` and always uses `callbackURL: '/dashboard'`. A co-organizer who is not already signed in therefore lands on the dashboard and never accepts the invite; the same happens if they sign up first.

After signing in (and after sign-up + email verification, where feasible) the user should return to the invite. Only same-origin relative paths may be honoured, so the parameter cannot become an open redirect. An integration test should cover the signed-out invite flow.

## Open questions
