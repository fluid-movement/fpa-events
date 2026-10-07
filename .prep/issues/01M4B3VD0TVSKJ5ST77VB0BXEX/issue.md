---
title: Verify the request origin behind Coolify after adapter-node 6
kind: manual
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
tags:
  - deploy
  - sveltekit3
priority: high
---

Source: UPDATE.md, "Deployment notes".

adapter-node 6 (SvelteKit 3) removed the `ORIGIN` environment variable in favour of the `paths.origin` option, and nothing in the repo sets it (`svelte-options.js`). If Coolify sets `ORIGIN` today, it is now ignored. Behind Coolify's HTTPS proxy, a wrong request origin would make SvelteKit's cross-site check reject every remote-function form POST and break redirects and absolute URLs (e.g. the calendar feed's event links).

Before going live, the deployed app must see its public `https://` origin: either `paths.origin` is configured, or the proxy headers are confirmed to produce the right origin. A form submission (sign-in, RSVP) must be verified working on the deployed instance.

## Open questions
