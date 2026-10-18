---
title: Rate-limit repeated wrong passwords on account deletion
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - security
priority: low
---

Source: review of the delete-account password check, 2026-10-18. deleteAccount verifies the current password but nothing throttles repeated wrong attempts: Better Auth's limiter covers only its own endpoints, so a hijacked session can guess the password through this form. Add a small per-user attempt limit (for example a few wrong passwords per quarter hour) to the remote function, with a clear message, and a test that the limit holds.

## Open questions
