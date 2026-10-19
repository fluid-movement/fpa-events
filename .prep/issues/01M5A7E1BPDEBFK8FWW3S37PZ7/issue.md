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

## Open questions
