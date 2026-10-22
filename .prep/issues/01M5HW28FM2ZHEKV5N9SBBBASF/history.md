- 2026-10-22T13:20:30Z claude-code: Implemented, ready for check: build passes under env -i with .env moved aside (auth.ts also needed a building-guarded secret placeholder); production refuses blank DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL; mutation caught by 4 tests.

- 2026-10-22T13:21:34Z claude-code: Checked by the orchestrator: placeholders only while building; env -i build with no secrets and no .env exits 0; env -i node build refuses to start ('DATABASE_URL environment variable is not set'); mutation of the production check fails 4 tests; 870 unit, auth-email + session 20/20.
