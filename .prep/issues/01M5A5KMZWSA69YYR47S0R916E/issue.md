---
title: Server error log line prints Drizzle query params, including calendar and invite tokens
kind: code
parent: 01M5A34YEEF5NVYZ4FXY7C25A9
tags:
  - security
priority: low
---

Finding from the input and output handling audit (01M5A34YEEF5NVYZ4FXY7C25A9).

**Vulnerability.** The server error log line includes Drizzle's full error message, query parameters included. `describeServerError` (`src/lib/server/errors.ts:43-49`) puts `${err.name}: ${err.message}` into `logLine`, and `hooks.server.ts:80` prints it. For a database error that message is `Failed query: <sql>\nparams: <every bound value>`. The file's own doc comment promises the line "never contains a URL path — the calendar feed and invite links carry their credential in it". But on those routes the credential is the first query parameter:

- `GET /api/calendar/[token]/feed.ics`: `where calendar_token = $1`, so a DB failure (connection reset, timeout, failover) logs the user's live calendar token. Calendar clients poll hourly, so an outage writes many of them.
- `GET /invite/[token]`: logs a live invite token on a DB failure.
- Any form write that fails logs every value the user submitted (names, descriptions, emails in Better Auth paths).

GlitchTip is protected: `redactErrorText` (`src/lib/error-tracking.ts:87`) cuts the `params:` tail and drops Postgres messages, per decision 01M57R12DXKFJBJPPTFW5G6M2B. The log line, however, does not use it.

**Reproduce.** Run the production build and request `/api/calendar/%00/feed.ics`. The log shows `[server error] ... | Error: Failed query: select "id", "name" from "user" where "user"."calendar_token" = $1` followed by `params: <the token from the path>`. A real token would be printed the same way whenever that query fails.

**Severity:** low. The logs stay on our Coolify host, but they are kept, viewed in a dashboard and copied into bug reports, and a calendar token is a long-lived bearer credential. **Blocks go-live:** no.

## Open questions
