---
title: 'Runtime image ships the whole checkout: dev toolchain, tests and the security audit records'
kind: code
parent: 01M5A3500S3M2DBNP0EZ1EC4WK
tags:
  - security
priority: low
---

Audit finding from 01M5A3500S3M2DBNP0EZ1EC4WK, 2026-10-19.

Severity: low. Go-live recommendation: does not block go-live. It widens what a container compromise or a malicious build-time dependency can reach; it does not expose anything over HTTP, because the server only serves build/client and its own routes.

## What the image ships, reasoned from the build

The repository has no Dockerfile, .dockerignore, nixpacks.toml or Procfile, so Coolify builds it with nixpacks' Node provider defaults plus whatever Coolify overrides (README.md:172-175 documents build `npm run build`, start `node build`). With a package-lock.json present, the provider installs with `npm ci` and does not omit dev dependencies for the build, then copies the whole checkout into the single runtime image. Nothing in the repository prunes afterwards. So, unless Coolify overrides it, the runtime image contains:

- every package in package-lock.json (771 entries), dev tooling included: vite-plus with its vulnerable Vitest/Tinypool copies (01M5A7A6EDVH5PV2Z7SMKRSKG6), drizzle-kit with esbuild 0.18.20 (accepted advisory), Playwright's test runner, husky, lint-staged, eslint, typescript;
- every tracked file: src/, tests/ and tests/integration helpers, .env.test (placeholders, no secrets), tools/migrate source (its node_modules are not installed: it is a separate package, not a workspace), .agents/, and .prep/ (567 files), which is the full security audit record including open, unfixed findings;
- build/ including 189 server-side .map files in build/server (not served; client maps are absent from the local build).

Part of this is by design today: README.md:163-167 runs `npm run db:migrate` (drizzle-kit, a devDependency) from the Coolify terminal, so pruning dev dependencies would break the documented migration path. `npm ci --omit=dev` alone would not remove the tooling either: Better Auth declares optional peers on drizzle-kit and Vitest, so the lock marks drizzle-kit, Vitest, Kit and Vite as non-dev (npm audit --omit=dev still reports 8 records).

The built server (build/server, local build of 2026-10-18) imports only runtime packages externally: @sveltejs/kit, svelte, cookie, valibot, ulid, postgres, sanitize-html, marked, mailgun.js, ical-generator, bcryptjs, leaflet, @sentry/sveltekit, @aws-sdk/client-s3 and node: builtins. No dev tool is imported, so the extra packages are dead weight on disk, not code the app runs.

Build-time execution: `npm ci` in the build runs the lock's install scripts (three esbuild postinstalls; fsevents is macOS-only) and the root `prepare` script (`svelte-kit sync; husky`) with whatever variables Coolify passes to the build. Which variables are build-time, and whether nixpacks writes them into image layers, is owned by deployment audit 01M5A34Z75BVD5BE4AZWWEDCPA (its acceptance 2); this finding does not re-file it.

## Not verified

Coolify was not called (another auditor owns it), so the actual install/start command overrides, any pruning setting, the image's file inventory and the Node patch are reasoned, not observed. The deployment audit should confirm from the latest deploy log or a container shell: install command (npm ci vs npm install), whether /app/node_modules contains vitest and vite-plus, whether /app/.prep exists, and `node -v`.

## Fix options (decide one)

1. Keep the single image but stop shipping what is not needed: a .dockerignore (or nixpacks config) that excludes .prep, .agents, tests, playwright artefacts and build/server/**/*.map; keep node_modules as is because migrations need drizzle-kit.
2. Build a slim runtime: a multi-stage build copying build/, package.json, package-lock.json, the migrations folder and drizzle config, then installing only runtime dependencies plus drizzle-kit, with migrations run from a separate one-off job rather than the app container.
3. Accept the current image explicitly, with the reason (private image, container access already implies env secrets).

Whichever is chosen, the migration path in README.md must still work and `node build` must still start.

## Open questions
