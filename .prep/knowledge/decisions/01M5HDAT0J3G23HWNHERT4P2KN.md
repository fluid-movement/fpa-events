---
type: decision
title: Every remote function declares its guard in remote-guards.test.ts
description: src/lib/server/remote-guards.test.ts maps every export of every *.remote.ts to a required guard (manager, owner, signedIn, dev, public) and fails on an unlisted or stale export or a guard after the first db access. Adding a remote function means adding its line there, so the authorization choice is made in the diff. Added 2026-10-22 by the authorization lock-in.
date: "2026-10-22"
issue: 01M5A4W5GTV7RNJ8T4MHFVTAKJ
scope:
  - src/**/*.remote.ts
---


