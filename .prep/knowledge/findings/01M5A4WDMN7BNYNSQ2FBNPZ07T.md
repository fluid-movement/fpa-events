---
type: finding
title: A layout server load does not guard its child pages' server loads
description: 'SvelteKit 3 runs only the nodes a __data.json request marks in x-sveltekit-invalidated (render_data in @sveltejs/kit/src/runtime/server/data/index.js skips the rest without calling them), so a client can run a page''s server load without its layout''s. Every +page.server.ts that returns data a guarded layout is meant to protect must run the guard itself (or await parent()). Remote functions are separate requests and never inherit a layout guard either. Verified 2026-10-19 on a dev server: /events/<id>/admin/schedule/__data.json?x-sveltekit-invalidated=001 ran the leaf for an anonymous caller (filed as 01M5A4T2FTPAV4Y429PTTQZKJ7).'
date: "2026-10-19"
issue: 01M5A34Y0620NBQFRA09MKZWNN
scope:
  - src/routes/**/+page.server.ts
---


