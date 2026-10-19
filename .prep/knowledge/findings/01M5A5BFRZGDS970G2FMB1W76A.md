---
type: finding
title: A GET load that writes is reachable cross-site with the session cookie
description: Better Auth's session cookie is SameSite=Lax, which browsers send on top-level GET navigations from other sites, and Kit's Origin checks cover only non-GET requests. Any +page.server.ts load (or remote query) that changes state on behalf of locals.user can therefore be triggered by a third-party page navigating the user. Writes belong in remote form()/command() calls, which are POSTs and get the Origin check. Found 2026-10-19 on the invite load (01M5A59J0WX9GYVYNN3PT2XE99); ensureCalendarToken on dashboard/attending is the only other GET write and is idempotent and self-only.
date: "2026-10-19"
issue: 01M5A45SRVRT71JY7RKBHSZBWE
scope:
  - src/routes/**/+page.server.ts
---


