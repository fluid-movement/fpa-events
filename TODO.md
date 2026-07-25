# TODO

## Observability

Parked 2026-07-25, while fixing migrations not running on deploy.

Context: a production 500 was only diagnosable by reading Coolify's Logs tab, and the
stack trace pointed at minified bundle chunks rather than source.

- [ ] **Add `--enable-source-maps` to the Coolify Start Command.** The build already emits
      source maps (175 chunks, 175 `.map` files) but Node ignores them for stack traces
      unless told to. Verified locally: `at t (bundle.js:1:21)` becomes
      `at loadEventThatFails (original.ts:3:8)`. Cheapest possible win — do this first.
- [ ] **Add a `handleError` hook** in `src/hooks.server.ts` (there is none today, so
      SvelteKit's default is in use — it logs `[status] METHOD /path` plus the stack, and
      nothing else). Log structured context: path, method, user id, and a correlation id
      that can be quoted back to a user reporting a problem. This is also exactly where
      Sentry would plug in.
- [ ] **Decide on error tracking.** Coolify logs are ephemeral (lost on redeploy), have no
      alerting, and never see client-side errors. Options:
      - `@sentry/sveltekit` on Sentry's **EU data region** with `sendDefaultPii: false`
        — recommended; free tier is 5k events/month. EU region matters given the GDPR
        care taken elsewhere in this app.
      - Self-hosted GlitchTip (Sentry-API-compatible, available as a Coolify one-click
        service) — keeps data on the Hetzner box, costs another container plus its
        Postgres to maintain.
