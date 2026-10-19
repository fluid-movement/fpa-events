---
title: fpa-api responses have no size bound or shape check
kind: code
parent: 01M5A45SJ0DTHEX1G0R86JKXEJ
tags:
  - security
priority: low
---

Finding from the untrusted-upstream-data audit (01M5A45SJ0DTHEX1G0R86JKXEJ).

**Vulnerability.** `fpaApiGet` (`src/lib/server/fpa-api/client.ts:40-58`) has a 10 s timeout, which also covers reading the body, but no size bound: `response.json()` buffers whatever arrives in that window, and `fetch` follows redirects. It then casts the JSON to the expected type without checking its shape. Callers dereference it directly (`eventIndex.ts:73-80` `batch.items`, `players.remote.ts:52-70` `profile.player.id`, `results.remote.ts:99-107` `detail.event.id`). A response that is valid JSON of the wrong shape throws a `TypeError`. That is not an `FpaApiError`, so `attempt()` rethrows it, and during SSR the page returns 500 instead of the "unavailable" notice the design promises. The bio enrichment is the one place that already validates (`src/lib/results/bio.ts`).

**Reproduce.** In `client.test.ts` style, stub `fetch` to return `{}` for `/events?...` and call `getResultEvents`: it throws a `TypeError` rather than returning `{ ok: false }`. An upstream answer of tens of MB is read fully into memory.

**Severity.** Low. fpa-api is first-party (api.freestyledisc.org), so this matters only if it is compromised, misconfigured or mid-deploy. The effect is a 500 or memory pressure, not data exposure. All fields are rendered as escaped Svelte text, so a hostile payload cannot inject markup (see the lock-in issue).

**Blocks go-live?** No.

## Open questions
