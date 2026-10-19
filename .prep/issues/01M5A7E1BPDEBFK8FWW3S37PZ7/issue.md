---
title: 'Lock in the verified defenses: dependencies'
kind: code
parent: 01M5A3500S3M2DBNP0EZ1EC4WK
tags:
  - security
priority: low
---

Audit lock-in from 01M5A3500S3M2DBNP0EZ1EC4WK, 2026-10-19. Informational/low priority; no independent go-live blocker.

Methods and limits: read package manifests and both lockfiles, inspect installed lifecycle/caller code and the existing build artifact, query current npm advisories, compare package versions/peer/engine ranges, and inspect Git's tracked filenames. These are static checks and read-only registry queries, not live attack probes. No install, app server, unit/integration test, rebuild, DB connection, real email, commit or push was run. Coolify access was denied, so image contents and actual deployed Node/package versions are explicitly unverified; acceptance 1 of the parent is not met. A lockfile checksum is not proof a publisher is trustworthy.

Vectors checked that held, and their pins:

1. Unexpected registry, git/file dependency, or missing integrity metadata in a locked package. All 771 app and 75 migration entries resolve to HTTPS registry.npmjs.org tarballs and carry sha512 integrity; both locks are v3. Defense: package-lock.json and tools/migrate/package-lock.json. Pin: inspect new resolved sources and integrity entries in dependency-update review and use credential-free npm ci. No app unit test: this is install metadata, not application logic. Actual tarball signature/provenance verification was not performed.

2. Accidental public npm publishing. Both manifests have private: true (package.json:4; tools/migrate/package.json:4). Pin: preserve this in manifest review; no render/unit/integration test for a package-manager flag.

3. Automatically running application migrations/seeding/picture deletion on install or startup. Root lifecycle is only svelte-kit sync plus husky (package.json:15); migration package has no install/prepare hook; destructive migration scripts require an explicit script invocation (tools/migrate/package.json:7-10). README.md:175 starts node build, not db:reset. Pin: lifecycle/start-command review on changes; no runtime test that executes destructive scripts. This is scoped to the checked source commands, not a claim about unseen Coolify hooks. The installer seeing secrets is separately filed in 01M5A7A6MS1NSH8EMQ2QRC9WNS.

4. Unaccounted dependency install execution. App lock has hasInstallScript on three esbuild copies and fsevents; migration lock on esbuild and fsevents. Installed esbuild scripts perform expected platform-binary installation/version checks, not application migrations or environment exfiltration. Root esbuild 0.28.2 and migration esbuild 0.28.1 also check a packaged SHA256 binary hash on the direct-download fallback; the older 0.18.20/0.25.12 fallbacks do not, so do not generalize that integrity claim. fsevents is a platform-specific optional package; the installed package declares no pre/install/postinstall command. Pin: re-inventory scripts on lock updates and keep installation credential-free (finding above). No new test of upstream installer code. This review is not a malware attestation for every transitive source file.

5. Old esbuild cross-origin dev-server advisory reachable from the app. GHSA-67mh-4wv8-2f99 affects esbuild's serve feature. The locked vulnerable copy is 0.18.20 under @esbuild-kit/core-utils, whose installed dist/index.js calls transform and transformSync only. The app uses plain Vite for dev and node build for deployment; no application call to this esbuild server was found. Accepted for this usage in parent finding 01M5A7BX6WXMQ29BP3BK8DSN93. Pin: recheck the caller if Drizzle/tooling changes; do not add an app test for third-party code or blindly downgrade drizzle-kit. Primary source: https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99

6. Production application requests reaching vulnerable Vitest mocking or Tinypool formatting. src/, tools/migrate/src and the existing build have no Vitest/mocker/Tinypool/oxfmt imports/calls; vite.config.ts uses jsdom and does not register public mockerPlugin/interceptorPlugin. Ordinary app dev runs Vite, not Vitest browser mode. Defense: separation of app and tooling entry points (package.json:11-15,29-30; vite.config.ts test configuration). Pin: manual build/import and start-command review after toolchain changes; no application integration test of unused upstream features. This is a reachability check, not a reason to leave vulnerable tools installed indefinitely: patching is 01M5A7A6EDVH5PV2Z7SMKRSKG6. npm audit --omit=dev still flags 8 moderate records due to optional peer relationships; do not treat it as the runtime package inventory.

7. Migration lock already carrying a reported advisory. Full npm audit of tools/migrate, including dev tools, returned zero; there was no installed-version drift against that lock. Pin: repeat the full audit before the next import/update and monthly until retirement, per decision 01M5A7BXTN2R18VM3V9S0AJPHQ. No app unit test can establish the absence of future advisories.

8. Migration dotenv file accidentally tracked for delivery via repository checkout. git ls-files reports neither root .env nor tools/migrate/.env; root .gitignore:15-19 and tools/migrate/.gitignore:2 exclude them. Pin: keep these exclusions and review tracked files for release; no new unit test. This does not attest image layers, injected env, or prior Git history. The same existing defense is recorded in 01M5A4YWDG7WFE35HB9NCBWMEY; no duplicate implementation/test request.

9. Core SvelteKit peer ranges rejecting Kit 3. Locked Kit3.0.0, adapter-node6.0.0, vite-plugin-svelte7.3.1, Svelte5.57.1, Vite8.3.2, Sentry11.8.0 and Better Auth1.7.8 have compatible relevant ranges. Node engine comparisons pass for every locked package at actual local Node24.22.0. Pin: repeat semver/peer inventory and existing check/unit/build gates on updates. Boundaries: two optional runed peers still ask for Kit2; npm ls is not clean, and vite-plus/core require >=24.11 on Node24. These are recorded in 01M5A7BXM33XBDJJ6JRQ9BVMT7 and 01M5A7BXDC9QZB3NMFZHTXVRJJ. No clean install was run. Do not certify all peers or deployed Node on the strength of this partial check.

Already owned elsewhere, not refiled:
- Production dev-route guards and their existing/manual checks: authorization lock-in 01M5A4W5GTV7RNJ8T4MHFVTAKJ.
- Production remote-function/upload origin checks: 01M5A5B3PG61A9PBZ68BYZT3E2; recheck after Kit upgrades with a production build, not Vite dev.
- Existing sanitizer/password/URL-defense regression tests: the upstream/input/auth lock-ins; no new wrapper tests requested here.
- Removal of migration tools and LEGACY_* after cutover: 01M4B48HQM4538H4JMG7942N2Y; read-only legacy credential provisioning: 01M5A4X9DHFRA3HK0KQB1DY1CF.

Review completion must distinguish repository lock, installed node_modules, existing build, and deployed image. Thirteen app installed versions differ from the lock, including Better Auth1.7.7 vs1.7.8; earlier auth runtime observations apply to the former. Actual image/Node/secret checks remain with the parent/deployment reviewer. Do not turn absence of an accessible image into a passed defense.

## Second pass (Claude, 2026-10-19)

Re-ran the read-only checks against the same locks (SHA256 root 985daa23..., tools/migrate 31ec44bd..., both unchanged since the first pass) and extended the list. Same limits: no install into the repo, no build, no Coolify. Better Auth, better-call and @better-auth/utils tarballs were fetched with `npm pack --ignore-scripts` into the audit scratch directory for a diff only.

### Advisory disposition (complete as of this pass)

`npm audit` root: 11 package records, 5 advisory-package pairs, 4 unique GHSAs. tools/migrate: 0. Each is filed or accepted:

| Advisory | Package (locked) | Disposition |
| --- | --- | --- |
| GHSA-82fw-gwwq-j7x9 | vitest, @vitest/mocker 4.1.10 (also propagates to @vitest/browser, @vitest/browser-preview, vite-plus) | Filed: 01M5A7A6EDVH5PV2Z7SMKRSKG6 |
| GHSA-5gmw-xhrv-c9v3 | tinypool 2.1.0 via oxfmt via vite-plus | Filed: 01M5A7A6EDVH5PV2Z7SMKRSKG6 |
| GHSA-85c8-ppgw-ccpr | tinypool 2.1.0 via oxfmt via vite-plus | Filed: 01M5A7A6EDVH5PV2Z7SMKRSKG6 |
| GHSA-67mh-4wv8-2f99 | esbuild 0.18.20 via @esbuild-kit/core-utils, esm-loader, drizzle-kit | Accepted: only the esbuild `serve` dev server is affected; core-utils calls transform/transformSync only, and drizzle-kit runs as a CLI (including `npm run db:migrate` in the Coolify terminal, README.md:163-167), never as a server. Do not take npm's suggested drizzle-kit 0.18.1 downgrade. Revisit when drizzle-kit changes or a caller of esbuild.serve appears. Recorded in /findings/01M5A7BX6WXMQ29BP3BK8DSN93.md |

`npm audit --omit=dev` still reports 8 moderate records because Better Auth's optional peers (drizzle-kit, vitest) make the lock mark them non-dev; that is not the runtime inventory.

### Further vectors checked that held

10. **The deploy installing something other than the reviewed lock.** package.json and package-lock.json are in sync for the root and tools/migrate (every declared range satisfied by the lock, root lock entries equal to the manifest), and there is no workspace or registry override (.npmrc holds only comments). With a lock present, nixpacks installs with `npm ci`, which refuses an out-of-sync manifest instead of resolving anew. So the deploy runs exactly the lock, including Better Auth 1.7.8, not the 1.7.7 found in local node_modules. Pin: the sync one-liner below on every dependency change; confirming the install command in the deploy log belongs to the deployment audit.

11. **Engines floors the deployed Node cannot meet.** No package in either lock fails its engines range at 22.19.0, 22.22.1, 24.11.0 or 24.22.0. At 24.0.0 only vite-plus and @voidzero-dev/vite-plus-core 0.2.9 fail; both are dev-only and not used by `vite build` or `node build`. Kit 3.0.0 needs >=22.17, matching package.json engines. The AGENTS.md text naming Node 22.19.0 is stale against decision 01M59PK8QMF1B7Z8BMMDMD6PH5 and is filed as 01M5A7WXXZEQD73V6QKVF2J6HT.

12. **Dev tooling executing in the running app.** The built server (build/server, local build of 2026-10-18) imports externally only runtime packages: @sveltejs/kit, svelte, cookie, valibot, ulid, postgres, sanitize-html, marked, mailgun.js, ical-generator, bcryptjs, leaflet, @sentry/sveltekit, @aws-sdk/client-s3 and node: builtins. The tooling is on disk in the image (filed as 01M5A7WXTDVVKVSFJZ1ETPYF0F) but never loaded by `node build`.

13. **Install-time scripts beyond the inventory.** Lock entries with hasInstallScript: root esbuild 0.28.2, 0.25.12 (drizzle-kit), 0.18.20 (core-utils) and optional fsevents 2.3.3; tools/migrate esbuild 0.28.1 and fsevents. Root lifecycle: only `prepare` (`svelte-kit sync || echo ''; husky || true`). Nothing else runs on `npm ci`. Which env those scripts see in the Coolify build is deployment audit 01M5A34Z75BVD5BE4AZWWEDCPA.

14. **SvelteKit 3 peer ranges.** `npm ls --package-lock-only --all` reports only the two optional runed 0.35.1 peers asking for Kit ^2.21.0 (the app imports no runed/kit subpath) and five missing optional Tailwind wasm32-wasi packages. Better Auth 1.7.8 declares `@sveltejs/kit ^2.0.0 || ^3.0.0`, which is why the old override could be dropped in 9e6b14b. npm ci does not fail on an invalid optional peer already recorded in the lock.

15. **Local install drift invalidating the auth audit.** Diffing 1.7.8 against the installed 1.7.7: the captcha plugin and rate limiter are unchanged; reset-password and change-password became transactional; magic-link and email-otp changed but the app does not load them; better-call 1.4.2 refactored cookie serialisation. Finding 01M5A6NTZZ25Z46EJQ6F23G7B1 still holds on 1.7.8 (revocation still gated by revokeSessionsOnPasswordReset). Recorded as a finding on the parent. The auth lock-in's cookie and reset observations should be rerun on a clean `npm ci` tree.

### Repeatable checks this lock-in should keep

No new unit or integration tests: these are packaging and supply-chain properties, not app logic (AGENTS.md, Testing). Keep them as commands in the dependency-review rule the user decides on (proposal recorded as a finding on the parent). Each runs read-only from the repo root:

- Advisories: `npm audit` and `(cd tools/migrate && npm audit)`; every advisory appears in the table above or in a filed issue.
- Lock sync and sources: every package.json range is satisfied by its lock entry, and every lock entry resolves to `https://registry.npmjs.org/` with a `sha512-` integrity.
- Engines: the AGENTS.md one-liner, run with the Node version from the latest deploy log.
- Install scripts: list lock entries with `hasInstallScript`; any new one is reviewed.
- Drift: compare each lock entry's version with `node_modules/<pkg>/package.json` before running any audit or probe against installed code.

## Open questions
