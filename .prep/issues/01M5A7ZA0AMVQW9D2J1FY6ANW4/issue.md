---
title: Every app secret is a Coolify build variable, exposing it to the image build and keeping the Sentry token at runtime
kind: manual
parent: 01M5A34Z75BVD5BE4AZWWEDCPA
tags:
  - security
---

Deployment audit, 2026-10-19, parent 01M5A34Z75BVD5BE4AZWWEDCPA (Opus continuation of the Codex run).

**Vulnerability.** Every runtime secret of the app is flagged as a Coolify *build* variable, so it is handed to the nixpacks image build as well as to the running container. Coolify passes build variables to `docker build` as build arguments; unless the application's "Use Docker Build Secrets" option is on, build arguments used by a `RUN` step are recorded in the image's history/metadata and stay on the server as long as the image is retained (image retention is not disabled on this server). Independently of image history, every secret is in the environment of the build steps, where `npm install` (the configured install command, not `npm ci`) runs the lifecycle scripts of every dependency — so a compromised dependency at build time receives the production database URL, the auth signing secret, the R2 keys and the legacy credentials, not just the build-only ones. In the other direction, `SENTRY_AUTH_TOKEN`, which only the build needs, is also a runtime variable, so it sits in the running container's environment where any code execution in the app can read it.

**Where.** Coolify application "NEW FPA Events" (uuid tfneo1jlnfvhzyshhwcovplf), Environment Variables. `list_env_keys` shows `is_buildtime: true` AND `is_runtime: true` for: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM_EMAIL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL, TURNSTILE_SECRET_KEY, GLITCHTIP_DSN, FPA_API_URL, HOST_HEADER, PROTOCOL_HEADER, SENTRY_URL, SENTRY_AUTH_TOKEN, PUBLIC_GLITCHTIP_DSN, PUBLIC_TURNSTILE_SITE_KEY and all five LEGACY_* keys. Only NIXPACKS_NODE_VERSION is build-only. Build command `npm run build`, install `npm install`, start `npm run db:migrate && node build` (deployment 0wotsqcticakf1uaehejsj3e log summary). In code, only `PUBLIC_GLITCHTIP_DSN` (CSP connect-src, svelte-options.js) and `SENTRY_AUTH_TOKEN`/`SENTRY_URL` (source-map upload, vite.config.ts:7-26) are needed at build time; src/env.ts declares nothing `static`.

**How to reproduce (class).** On the server, inspect the current app image's history and config (`docker history --no-trunc` / `docker image inspect` of image `tfneo1jlnfvhzyshhwcovplf:<sha>`) and look only for the *key names* above next to `RUN` steps or in `Config.Env`; do not copy values anywhere. Whether build-secrets mode is on is a per-application Coolify setting that the read-only MCP does not expose, so the image-history part is unconfirmed; the build-environment and runtime-token parts follow from the flags alone.

**Severity.** Medium. Reading image history needs Docker access on the host (already root-equivalent), so the main real risk is the widened supply-chain exposure at build time and the long-lived Sentry token at runtime. Not a go-live blocker; cheap to fix before cutover.

**Fix.** In Coolify, untick "Build Variable" for every key except NIXPACKS_NODE_VERSION, PUBLIC_GLITCHTIP_DSN, SENTRY_URL and SENTRY_AUTH_TOKEN; untick "Runtime" for SENTRY_AUTH_TOKEN (and NIXPACKS_NODE_VERSION already is). If the build then fails because a server module needs DATABASE_URL at analyse time, give the build a non-secret placeholder rather than the real value. Turn on "Use Docker Build Secrets" if the version offers it, so the Sentry token is not in image history either. Redeploy, then prune images built before the change. Consider `npm ci` as the install command (dependency audit's call). When the LEGACY_* keys are added back for any re-run, add them runtime-only.

## Open questions
