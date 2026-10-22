- 2026-10-22T08:16:55Z claude-code: Implemented, ready for check: bounded 5-minute in-process cache (500 entries, failures uncached) for profile and event-detail reads; no per-IP limiter added (left for owner/proxy)

- 2026-10-22T08:21:56Z claude-code: Check passed: bounded TTL cache (500, 5min, in-flight dedupe, failures uncached) keyed by full upstream path, satisfies AC1 via cache-only (and/or) and AC2 tests. Note: distinct valid-UUID misses still hit upstream; limiter left to deployment audit.
