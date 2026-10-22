- 2026-10-19T14:10:42Z claude-code: Deployment audit (Opus): confirmed BODY_SIZE_LIMIT is NOT set on the Coolify app tfneo1jlnfvhzyshhwcovplf (env key list, 2026-10-19), so production runs adapter-node's 512K default and the bug is live.

- 2026-10-22T06:41:14Z codex: Implemented, ready for check: Upload bodies are bounded to 11 MiB, file and adapter size failures return JSON 413, and the UI handles JSON/non-JSON size errors; 530 unit tests pass, owner must set/verify Coolify runtime BODY_SIZE_LIMIT=11M and redeploy (documented in AGENTS.md), orchestrator runs event-picture.test.ts.

- 2026-10-22T06:48:08Z claude-code: Implemented, ready for check: endpoint returns JSON 413/400 for body failures, bounded 11 MiB body, ImageUpload shows size message. Owner action: set Coolify runtime env BODY_SIZE_LIMIT=11M and redeploy (not done, no Coolify change made); chose finite limit aligned with upload-body.ts, documented in AGENTS.md.

- 2026-10-22T06:51:18Z claude-code: Check passed: reviewed sniff/body cap/limiter/sweep; npm run check and vp test run pass (543); mutation checks (sniff, limiter, sweep reference check) fail tests as expected, reverted. Note: stream body cap mutation survived (test masked by 10MB file check); BODY_SIZE_LIMIT=11M is owner action.

- 2026-10-22T08:16:05Z claude-code: Code merged in b10fd23. Owner: Coolify has no BODY_SIZE_LIMIT key (checked 2026-10-22 via list_env_keys); set BODY_SIZE_LIMIT=11M as a runtime variable on NEW FPA Events and redeploy, then check criterion 1.

- 2026-10-22T13:12:58Z claude-code: Owner set BODY_SIZE_LIMIT=11M (runtime only) in Coolify 2026-10-22; confirmed via list_env_keys. Takes effect with the next deploy.
