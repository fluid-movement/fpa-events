---
title: NUL bytes, out-of-range years and malformed remote payloads are anonymous 500s and GlitchTip reports
kind: code
parent: 01M5A34YEEF5NVYZ4FXY7C25A9
tags:
  - security
---

Finding from the input and output handling audit (01M5A34YEEF5NVYZ4FXY7C25A9).

**Vulnerability.** Any anonymous visitor can turn a malformed id, year or remote-query payload into a 500. Each one is logged as an unexpected error and reported to GlitchTip with a fresh reference. This is the same harm as 01M5A4TE7KPBQEDTVNCYXKX1GN (unlimited error reports and alert noise), but it needs no remote-function hash and no session. Nothing is exposed: the error page shows only "Internal Error" and a reference.

The causes:

- **NUL byte in a path parameter.** Postgres rejects `\0` in text (`22021 invalid byte sequence for encoding "UTF8": 0x00`), and the routes pass the decoded param straight into a query:
  - `src/routes/events/[id]/+page.server.ts:14`
  - `src/routes/invite/[token]/+page.server.ts:11`
  - `src/routes/api/calendar/[token]/feed.ics/+server.ts:9-12`
  - the same applies to `toggleRsvp` (`src/routes/events/[id]/data.remote.ts`, which uses `params.id`) and to every remote-function string argument that reaches a query
- **Out-of-range year.** `src/routes/events/past/[year]/+page.server.ts:13-14` only checks `Number.isInteger`.
  - `1e20` and `275761` give an Invalid Date, so Drizzle throws `RangeError: Invalid time value`.
  - `99999` and `-5000` give dates that Postgres cannot parse (the query fails).
- **Malformed remote-query payload.** `GET /_app/remote/<hash>/<query>?payload=<not base64/JSON>` makes Kit's payload decoding throw a `SyntaxError` before validation, so it is answered as a 500 `(no route)`. A well-formed payload of the wrong type is correctly a 400. This hits every public query that takes an argument (`getEventResults`, `getPlayerProfile`, ...).

**Reproduce.** I started the existing production build (`node build` on its own port, dev DB) and sent these anonymous GETs. Each gave a 500, a `[server error]` log line and (with a DSN) a GlitchTip event:
- `/events/%00`, `/invite/%00`, `/api/calendar/%00/feed.ics`
- `/events/past/99999`, `/events/past/1e20`
- `/_app/remote/<hash>/getPlayerProfile?payload=AAAA`

One passive GET of `/events/%00` on events-dev also answered 500. For comparison, malformed percent-encoding (`%ZZ`, `%C0%AF`) is a 400 in the build (only Vite's dev middleware 500s), an over-long URL is a 431 and a non-numeric year is a 400.

**Severity:** low (availability of error tracking; no data exposure). **Blocks go-live:** no. I recommend fixing it before launch, together with 01M5A4TE7KPBQEDTVNCYXKX1GN, so GlitchTip stays usable on day one.

## Open questions
