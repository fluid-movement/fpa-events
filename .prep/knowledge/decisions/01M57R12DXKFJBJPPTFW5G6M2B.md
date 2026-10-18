---
type: decision
title: Error reports allowlist database error text instead of redacting it
description: 'Decided 2026-10-18 after two failed reviews of a pattern-based redactor. Postgres writes user-controlled values into error messages unescaped (a value can contain quotes and parentheses), so no pattern list can promise to remove them. Sentry''s own data-scrubbing guidance gives three layers (SDK-side filtering, server-side scrubbing, a Relay) and prefers keeping data out of the SDK; GlitchTip offers only the SDK layer. So for any PostgresError the event keeps the error type, the SQL state code, the constraint name and the stack, and drops the message and detail; for a DrizzleQueryError it keeps the SQL text up to its params: tail and drops the rest. Other errors keep their message. Everything earlier still holds: no breadcrumbs, no request data, the user as an id only, route id as transaction, no extra, span data or frame variables.'
date: "2026-10-18"
issue: 01M57PXCVCR4R7P80NS5KH3MYX
supersedes:
  - 01M57N612M4A7WRSDN0HW0EMY2
---


