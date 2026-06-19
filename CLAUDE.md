# FPA Events

## Git Workflow

**Mode: direct-to-main**

This is a private repository without branch protection enabled. Commits go directly to `main` — no feature branches or PRs required.

After completing each feature or meaningful unit of work, create a commit using the `/commit` skill before moving to the next task.

## Code Style

**Always use remote functions for server interactions** — never traditional form actions or `+page.server.ts` `actions`. Use `form()` and `query()` from `$app/server` in `data.remote.ts` files colocated with the route. The project has `remoteFunctions: true` enabled in `svelte.config.js`.

**Always use modern Svelte 5 runes** — `$state`, `$derived`, `$derived.by`, `$effect`, `$props`. Never legacy reactive syntax (`$:`, `let` stores, etc.).

**No `use:enhance`** — remote functions handle progressive enhancement automatically via `{...formAction}` spread on `<form>` elements.
