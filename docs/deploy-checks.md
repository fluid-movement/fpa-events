# Deployment checks

Repeatable, read-only checks for the deployed app and its infrastructure. Nothing here
logs in, posts, or changes state. Never record secret values, only key names and flags.

## 1. Passive HTTP check (`scripts/deploy-check.sh`)

```
scripts/deploy-check.sh                              # events-dev.fluid-movement.de
scripts/deploy-check.sh events.freestyledisc.org     # after cutover
scripts/deploy-check.sh events.freestyledisc.org --ports
```

Plain GET requests, reading status and headers. Prints `PASS`/`FAIL` per check; the exit
status is the number of failures. Run it once per change, from a machine with normal
internet access. An egress proxy that blocks the hosts answers every request with 403,
which shows up as a wall of FAILs rather than a real finding.

It checks:

- **App** (`src/hooks.server.ts`, `svelte-options.js`): `http://` redirects to the same host over
  `https://`; `/`, `/sign-in` and `/events` answer 200 with `strict-transport-security`,
  `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`,
  `x-frame-options: DENY`, `permissions-policy`, and a CSP whose `script-src` carries a nonce and
  no `unsafe-inline`/`unsafe-eval`, plus `object-src 'none'`, `frame-ancestors 'none'`,
  `base-uri 'self'`, `form-action 'self'`; `/healthz` answers 200 with body exactly `ok` and
  `content-security-policy: default-src 'none'; frame-ancestors 'none'`.
- **GlitchTip** (`glitchtip.fluid-movement.de`): HTTP redirects to HTTPS; `/` and `/login`
  answer 200 with `x-frame-options` and `nosniff`; HSTS is expected (issue
  01M5A7AYSP4BYF7T63NA98ERQJ, still open until GlitchTip sends it); `/api/settings/` reports
  `enableUserRegistration` and `enableOrganizationCreation` as `false`.
- **Coolify** (`coolify.fluid-movement.de/login`): status and security headers are printed as
  `INFO` only. The public dashboard is a known finding (01M5A7ZAEBDP706QYZDYBQBGH2).
- **Ports** (only with `--ports`, a TCP connect-and-close with no bytes sent): 22, 80 and 443
  open; 3000, 5432, 6001, 6002 and 8000 filtered, on the first IPv4 and IPv6 address.

If the live host lacks a header the code sets, the deployment may lag `main`: confirm against
the deployed commit before calling it a failure, and rerun after the next deploy.

## 2. Coolify configuration check (owner or orchestrator, read-only tools)

Use only read-only Coolify calls (list/get). Record names and flags, never values.

| Check             | Command (MCP tool)                                                                                | Acceptable                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App env keys      | `list_application_envs` for the app                                                               | Names recorded with `is_buildtime` / `is_runtime`. Runtime secrets (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `MAILGUN_API_KEY`, `R2_SECRET_ACCESS_KEY`, `TURNSTILE_SECRET_KEY`, `LEGACY_*`) should be runtime-only. Today they are also build variables (01M5A7ZA0AMVQW9D2J1FY6ANW4). Only `PUBLIC_*` and `SENTRY_AUTH_TOKEN` need build access. |
| Proxy headers     | same list                                                                                         | `HOST_HEADER` and `PROTOCOL_HEADER` present, `ORIGIN` absent (decision 01M5A2XJC28ZGAW405A88YKK8E).                                                                                                                                                                                                                                           |
| `BODY_SIZE_LIMIT` | same list                                                                                         | Set, or knowingly unset (01M5A5KN8H0S977JQ72P7C1AAH).                                                                                                                                                                                                                                                                                         |
| `LEGACY_*` keys   | same list                                                                                         | Present before cutover only; removed afterwards (01M4B48HQM4538H4JMG7942N2Y).                                                                                                                                                                                                                                                                 |
| App database      | `get_database` for `events-postgres`                                                              | `is_public: false`; port mapping only `127.0.0.1:<port>`, never `0.0.0.0`.                                                                                                                                                                                                                                                                    |
| Other databases   | `get_database` / `get_service_database` for GlitchTip postgres and redis, and the legacy database | `is_public: false`, no published ports. The legacy database currently fails this (01M5A7ZA3CE2CD7A5KDQVB6N90).                                                                                                                                                                                                                                |
| App ports         | `get_application`                                                                                 | `ports_mappings` null; only the proxy network reaches port 3000.                                                                                                                                                                                                                                                                              |
| Team              | `list_team_members`                                                                               | Only the expected owner(s). Re-run whenever access changes.                                                                                                                                                                                                                                                                                   |

Record the date, the Coolify resource ids and each result in the work log.

## 3. Unit tests that pin the in-app defenses

These already exist and must stay as they are; do not duplicate them.

| Vector                         | Test                                 |
| ------------------------------ | ------------------------------------ |
| 7 Error-tracking scrubbing     | `src/lib/error-tracking.test.ts`     |
| 7 Route-id logging             | `src/lib/server/errors.test.ts`      |
| 9 CAPTCHA fails closed         | `src/lib/server/turnstile.test.ts`   |
| 8 `/healthz` withholds details | `src/routes/healthz/healthz.test.ts` |

Run: `npx vp test run src/lib/error-tracking.test.ts src/lib/server/errors.test.ts src/lib/server/turnstile.test.ts src/routes/healthz/healthz.test.ts`

## 4. GlitchTip spot check (owner or orchestrator, read-only tools)

Stored events must hold no personal data. After any change to `src/lib/error-tracking.ts`, and
after cutover:

1. List issues of the `events-new` project in organization `fpa`; pick one with a recent event.
2. Fetch its latest event (read-only) and confirm:
   - no `request` entry (no URL, query string, cookies, headers or body);
   - no `user` entry and no IP address;
   - `breadcrumbs` empty or absent;
   - `transaction` is a route id such as `/events/[id]`, not a concrete URL;
   - database errors read `[database error: message dropped]` and carry no Drizzle params;
   - tags limited to `errorId`, `release`, `environment`, `server_name`, `os`.
3. Any email, token, IP or query value in the event is a finding: file it and re-check the
   scrubber and its tests.

Last known good sample (2026-10-19): `EVENTS-NEW-1`, a Drizzle failure from a NUL-byte id, was clean.
The container log still prints the failed query line (01M5A5KMZWSA69YYR47S0R916E); that is
separate from stored events.
