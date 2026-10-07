---
title: Re-confirm the password before deleting an account
kind: code
parent: 01M4B368MKSHRQWYJ2XMZD7TXV
tags:
  - security
  - parity
priority: low
---

Source: retired docs/laravel-features.md, "Authentication & User Management"; /features/laravel-parity.md.

The Laravel app asked users to re-enter their password before sensitive actions. Here `deleteAccount` (`src/routes/settings/account/data.remote.ts`) deletes the account, and every event the user created, on a confirmation click alone, so anyone with a hijacked or unattended session can do it. Account deletion should require the current password (or a fresh sign-in).

## Open questions
