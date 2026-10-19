---
type: finding
title: Peer compatibility and local install drift limit reproducibility
description: 'Core locked peer ranges accept Kit3/Svelte5/Vite8: Kit3.0.0, adapter-node6.0.0, vite-plugin-svelte7.3.1, Sentry11.8.0, Better Auth1.7.8. Two runed0.35.1 copies under bits-ui and svelte-toolbelt declare optional @sveltejs/kit ^2.21.0 (package-lock.json:6326,10742), so npm ls --package-lock-only --all reports Kit3 invalid; their Kit-specific subpath is not imported by this app. Record as compatibility/deploy-validation caveat, not a demonstrated security bypass. npm ls also reports five missing packages of the optional Tailwind wasm32-wasi target, not evidence of a native Linux production exploit. No install/build attempted under read-only scope. Auth record 01M5A6T8PPDZ22E4B1N4AWYJQ9 is confirmed: installed Better Auth/core/adapters are1.7.7 vs lock1.7.8; total13 installed package versions differ (also utils, better-call, nanostores, set-cookie-parser,zod). Migration installed versions match the lock. Registry audit results describe locks, while earlier dynamic auth probes describe the installed tree; reconcile via clean locked installation and revalidation during implementation, never during this audit.'
date: "2026-10-19"
issue: 01M5A3500S3M2DBNP0EZ1EC4WK
---


