- 2026-10-22T06:45:19Z claude-code: From the error-handling review 2026-10-22: Better Auth's own updateUser endpoint accepts a NUL-bearing name and reaches the DB adapter; the NUL check in settings/profile/data.remote.ts only covers the wrapper. Enforce validation at the auth API boundary (e.g. a Better Auth before-hook on update-user and sign-up) and test direct requests.

- 2026-10-22T07:38:22Z claude-code: Implemented, ready for check: Better Auth user create/update before-hooks drop image (chosen: no avatar feature) and refuse non-string/over-long/control-char names; profile form shares the schema.

- 2026-10-22T07:40:56Z claude-code: Check passed: databaseHooks user.create/update before call guardUserWrite; no admin/changeEmail plugin enabled; legacy import and seed write image NULL; image nulled (not rejected), so no 400/legacy breakage; APIError BAD_REQUEST for names. Mutation-tested image drop and line-separator regex (tests fail). check and vp test run green.

- 2026-10-22T08:25:14Z claude-code: Code merged in 24962bd (Sonnet implemented, Sonnet reviewed, full suite 195/195). Remaining: owner runs the production data check in the Coolify terminal (DB ports are firewalled), then checks the last criterion.
