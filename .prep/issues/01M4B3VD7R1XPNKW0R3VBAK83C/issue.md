---
title: Run the full integration suite against fpa-api after the Kit 3 upgrade
kind: manual
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
tags:
  - testing
  - sveltekit3
priority: high
---

Source: UPDATE.md, "The suite".

The SvelteKit 3 migration was verified with 92 passed / 23 failed / 1 skipped. The 23 failures are the `/rankings`, `/results`, `/players` and console-canary specs that need network access to `fpa-api.fluid-movement.de`, which the migration machine did not have. They cover the remote-function and caching surface most exposed to the Kit 3 changes, so they have not actually been verified on Kit 3.

The whole integration suite must pass on a machine with access to fpa-api before going live.

## Open questions
