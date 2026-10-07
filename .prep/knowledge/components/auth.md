---
type: component
title: Authentication
description: Better Auth setup, email verification, legacy bcrypt hashes, Turnstile, auth pages and account deletion.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:45:34Z
scope:
  - src/lib/server/auth.ts
  - src/lib/server/password.ts
  - src/lib/server/turnstile.ts
  - src/hooks.server.ts
  - src/lib/auth-client.ts
  - src/routes/sign-in
  - src/routes/sign-up
  - src/routes/forget-password
  - src/routes/reset-password
  - src/routes/settings
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Authentication

Better Auth, configured in `src/lib/server/auth.ts` with the Drizzle adapter,
and served at `/api/auth/*` by `svelteKitHandler` in `src/hooks.server.ts`.
The browser uses `#lib/auth-client` (`client`, `signIn`, …).

## Email and password

- `requireEmailVerification: true`. Sign-up sends a verification mail, and so
  does a sign-in attempt while unverified (`sendOnSignIn`). Verifying signs the
  user in (`autoSignInAfterVerification`). Mails go through
  `/components/email.md`, fire-and-forget.
- Password reset: `/forget-password` → mail → `/reset-password`.
- `settings/password` calls `client.changePassword` directly.
- **Legacy hashes**: `src/lib/server/password.ts` plugs custom
  `hash`/`verify` into Better Auth. New hashes are Better Auth's scrypt.
  Verification accepts bcrypt (`$2y$`/`$2a$`/`$2b$`) from the Laravel import,
  rewriting PHP's `$2y$` to `$2b$`. Hashes are not upgraded on login.

## Bot protection

Turnstile is enabled only when `TURNSTILE_SECRET_KEY` is set. Better Auth's
`captcha` plugin then guards sign-up, sign-in, password-reset request and
resend-verification, and the client sends the token as `x-captcha-response`.
Non-auth forms (create/edit event) call `requireTurnstile(token)` from
`src/lib/server/turnstile.ts`. With no key, it always passes.

## Per-request session

`handle` calls `auth.api.getSession` and sets `locals.session` and
`locals.user`, then reads `role` from the `user` table into `locals.role` (one
extra query per signed-in request). See `/pitfalls/better-auth-session-fields.md`.

## Pages

`sign-in`, `sign-up`, `forget-password` and `reset-password` are client-only
pages built on `<AuthCard>` + `<AuthForm>`, with a local `loading` flag.
Sign-in always lands on `/dashboard`. It ignores any `?redirect=`, which breaks
the signed-out invite flow (tracked as a bug).

## Account deletion

`settings/account` `deleteAccount` deletes the user's own events first
(`events.user_id` has no cascade), then `verification` rows by email, then the
user (cascading to session, account and event_user). R2 pictures of the
deleted events are not removed.
