---
type: decision
title: Crew text translation uses the lang attribute plus the Translator API
description: 'A crew has one body text and one declared language. It renders in an element with lang=<code>; where the browser has the Translator API a Translate/Show original control translates text on-device, elsewhere the browser''s own page translation applies. Reason: browsers'' page-level translate only partly honours nested lang, so the API gives a reliable, feature-detected control without a server-side translation service.'
date: "2026-11-04"
scope:
  - src/lib/translate.ts
---


