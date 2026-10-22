- 2026-10-19T14:10:42Z edited by claude-code: priority

- 2026-10-19T14:10:42Z claude-code: Deployment audit (Opus, Coolify read-only): TURNSTILE_SECRET_KEY and MAILGUN_API_KEY both exist on the app (tfneo1jlnfvhzyshhwcovplf), runtime and build. MAILGUN_API_KEY is nonblank: the container log shows '[email] Sent ...', which only the Mailgun path prints, and no console-fallback lines. Turnstile secret nonblank could not be confirmed (values are never returned; asked in 01M5A7ZANWK8D315ZE8FD47HJZ). Rated low: the live deployment is not in the fallback; this remains hardening against a future misconfiguration. Criterion 3 stays open until the Turnstile answer.

- 2026-10-22T08:18:35Z claude-code: Implemented, ready for check: production (not dev, not building) refuses to start and refuses CAPTCHA/mail without TURNSTILE_SECRET_KEY, MAILGUN_API_KEY, MAILGUN_DOMAIN (key names only in the error); dev/test fallbacks and secret-free build kept. Most secure option chosen: fail at startup plus per-request guard. Owner: confirm all three keys are nonblank in Coolify runtime env before deploy (criterion 3), else the new container will not start.

- 2026-10-22T08:22:04Z claude-code: Check passed: reviewed diff; check/vp test (682)/build pass without Turnstile/Mailgun keys; production=!dev&&!building correct for node build, dev:test (dev=true) and build; mutation (disable gate) fails 3 tests, reverted, diff unchanged; error path logs key names only. Pending owner: criterion 3 (confirm nonblank deployed keys).

- 2026-10-22T08:54:44Z claude-code: Code merged in 6ea6bc8. Owner before the next deploy: confirm TURNSTILE_SECRET_KEY, MAILGUN_API_KEY and MAILGUN_DOMAIN are non-blank runtime variables in Coolify, otherwise the new container refuses to start.

- 2026-10-22T12:58:38Z claude-code: Owner confirmed 2026-10-22: TURNSTILE_SECRET_KEY, MAILGUN_API_KEY and MAILGUN_DOMAIN are set (non-blank) in Coolify for NEW FPA Events.
