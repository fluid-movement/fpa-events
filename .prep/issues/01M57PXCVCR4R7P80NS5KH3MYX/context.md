Extend the shared scrubber in `src/lib/error-tracking.ts` (used by `hooks.server.ts` and `hooks.client.ts`; see /decisions/01M57N612M4A7WRSDN0HW0EMY2.md). Tests live in `src/lib/error-tracking.test.ts`.

- **What the event contains:** `event.exception.values[]` (one entry per error in the cause chain, each with `value`), `event.message` / `logentry.formatted`, and the title GlitchTip derives from them. The live event showed `PostgresError: invalid byte sequence ...` chained under `Error: Failed query: select ... params: <values>`.
- **Drizzle:** `DrizzleQueryError` message is `Failed query: ${sql}\nparams: ${params.join(',')}`; it also keeps `.query`, `.params` and `.cause` properties. Cut everything from `\nparams:` on. Do not attempt to match values; cut by structure.
- **Postgres:** messages and the `detail` field can embed values, e.g. `Key (email)=(x) already exists`; replace the parenthesised value, keep the column and the error code.
- **Instrumentation:** the Drizzle OpenTelemetry integration sets `drizzle.query.params` on spans; the Sentry Node SDK may attach span data under `contexts.trace.data` (already dropped) and in transactions. Verify no params appear anywhere, including with `tracesSampleRate` left at its default (tracing should stay off).
- **Also check:** `includeLocalVariables` must stay off; stack-frame `vars`, `extra`, and `contexts` carry no request values.
- Keep the SQL text; it holds placeholders (`$1`), not values.
- Verify against real shapes: construct a `DrizzleQueryError` and a postgres.js `PostgresError` in the test rather than hand-writing strings. After deploy, repeat `GET /events/%00` and read the event through the GlitchTip MCP.
