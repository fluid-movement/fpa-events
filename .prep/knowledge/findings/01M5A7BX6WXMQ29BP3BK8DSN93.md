---
type: finding
title: Advisory disposition for both dependency locks
description: '2026-10-19 read-only npm audit --json --ignore-scripts: app 11 affected package records (3 critical, 8 moderate), representing four unique advisories; tools/migrate 0. Root lock SHA256 985daa230973dbbde74f58c28ca20a9dde5062000136262475a7fa5fee9e65a3; migration lock 31ec44bdb1d8378df0339da19ffb750e61950f36f1c95731d94dc53dd6a5e092. GHSA-82fw-gwwq-j7x9 (Vitest/mocker 4.1.10) and GHSA-5gmw-xhrv-c9v3 plus GHSA-85c8-ppgw-ccpr (tinypool 2.1.0 via oxfmt/vite-plus) are filed in 01M5A7A6EDVH5PV2Z7SMKRSKG6. All propagated package records are covered by those or the following acceptance: GHSA-67mh-4wv8-2f99 in esbuild 0.18.20 via drizzle-kit -> @esbuild-kit/esm-loader -> core-utils is accepted for current usage, because core-utils calls only transform/transformSync, never the vulnerable esbuild serve feature. Ordinary dev is Vite 8; node build has no toolchain import; do not downgrade drizzle-kit to npm audit''s 0.18.1 suggestion. Revisit acceptance if a caller starts esbuild.serve or dependency paths change. Primary sources are the four maintainers'' GitHub security advisories. npm audit --omit=dev still reports 8 moderate records: Better Auth has optional peers on drizzle-kit and Vitest, so these are not marked dev-only in the lock. npm omit=dev alone is not proof tools are removed from the image. No exploitation or installs performed.'
date: "2026-10-19"
issue: 01M5A3500S3M2DBNP0EZ1EC4WK
---


