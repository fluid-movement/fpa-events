---
title: Redact query values and personal data from error report messages
kind: code
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
depends_on:
  - 01M4D4DQ5FKMY2CJ2X9AJZGJFD
tags:
  - observability
  - security
  - privacy
priority: high
---

Source: live test of the GlitchTip integration, 2026-10-18 (event EVENTS-NEW-1), and the user: query values must be redacted, this would be an attack vector.

`scrubEvent` (`src/lib/error-tracking.ts`) strips the request, breadcrumbs and user details, but not the text of the exception itself. Drizzle wraps every failed query in a `DrizzleQueryError` whose message is `Failed query: <sql>\nparams: <values>`, and Postgres errors can carry values too (a unique violation's detail reads `Key (email)=(a@b.c) already exists`). Those values can be emails, password-reset or invite tokens, calendar-feed tokens or free text typed by a user, and they would be stored in GlitchTip and readable by anyone with access to it, or by an agent through the MCP.

No exception text, title or message that reaches GlitchTip may contain a query parameter value or a value copied from user input. The SQL text and the error type stay, so the event is still diagnosable.

- Cut the `params:` tail off Drizzle query errors, in the exception values (including the cause chain), the event message and the title.
- Remove values from Postgres error text and detail (`Key (...)=(...)`, `DETAIL` lines).
- Check the rest of the event for the same data: stack-frame variables, `extra`, contexts and span data, in particular the `drizzle.query.params` span attribute the instrumentation sets, and make sure nothing there leaves the site.
- Keep it in the shared scrubber so server and browser both get it, and unit-test it with real-shaped error messages.

The scrubbing decision is /decisions/01M57N612M4A7WRSDN0HW0EMY2.md.

Decided 2026-10-18 (see the decision record): redacting by pattern is replaced by an allowlist. For a PostgresError keep only the error type, the SQL state code, the constraint name and the stack; drop its message and detail entirely. For a DrizzleQueryError keep the SQL text up to the params: tail and drop the tail. A failing redaction step falls back to a fixed placeholder, never the original text. The scrubber must not throw on null, non-object or non-string entries anywhere in the event (exception.values, stack frames, spans).

## Open questions
