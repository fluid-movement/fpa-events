- 2026-10-07T11:50:39Z edited by claude-code/opus-5.5: parent

- 2026-10-07T15:18:23Z claude-code/opus-5.5: Verified on the production build (node build) with an unreachable DB: page 500 shows 'quote reference <id>', log has the same ref with GET / route, user=anonymous and the stack. On Node 22.19 and 24.21 the app frame is already src/routes/+page.server.ts:14:43 without --enable-source-maps; the flag only adds absolute paths and framework/dependency frames, so the Coolify setting is optional, not required.
