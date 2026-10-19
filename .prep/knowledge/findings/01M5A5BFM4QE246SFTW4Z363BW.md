---
type: finding
title: SvelteKit 3 Origin checks only run in production builds
description: 'Kit 3''s respond.js wraps both cross-site checks in if (!__SVELTEKIT_DEV__): remote functions (any non-GET whose Origin is not the app''s own, trustedOrigins ignored) and form-content-type POST/PUT/PATCH/DELETE to pages and +server.ts (csrf.checkOrigin). So vite dev and the integration suite (npm run dev:test) never exercise them; probe with a production build. The adapter-node build here bakes origin at build time (undefined) and derives the request origin from Host with the protocol defaulting to https, so a runtime ORIGIN env var is not read and a same-origin probe must send Origin: https://<host>. Verified 2026-10-19 on node build: cross-site, null and missing Origin all 403, same-origin passes.'
date: "2026-10-19"
issue: 01M5A45SRVRT71JY7RKBHSZBWE
scope:
  - src/hooks.server.ts
---


