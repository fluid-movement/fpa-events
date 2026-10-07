---
title: Readable production stack traces and a handleError hook
kind: code
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
tags:
  - observability
priority: high
---

Source: TODO.md, "Observability".

Production 500s are only diagnosable from Coolify's ephemeral log tab, and their stack traces point at minified chunks. The build already emits source maps, but Node ignores them without `--enable-source-maps` on the Coolify start command. There is no `handleError` in `src/hooks.server.ts`, so only SvelteKit's default `[status] METHOD /path` + stack is logged.

Stack traces in production should name source files, and server errors should be logged with path, method, user id and a correlation id that is shown to the user so they can quote it back.

## Open questions
