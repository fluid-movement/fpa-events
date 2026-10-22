- 2026-10-22T07:38:22Z claude-code: Implemented, ready for check: coordinates validated (finite, in range), city/country bounded, shared rows keyed by coordinates too so first writer cannot pin a city (chose per-coordinate rows, no schema change), map skips non-finite.

- 2026-10-22T07:40:56Z claude-code: Check passed: ran npm run check (0 errors) and vp test run (529 pass); reviewed eventForm coordinate/length schema, eventLocations coord-keyed match, EventsMap isFinite filter; mutation-tested range check (fails). Criterion 6 (prod event_locations audit) pending, owner item. Advisory: schedule venue coords (locations.remote.ts) not range-checked; latitude term of match not covered by a test.

- 2026-10-22T08:25:14Z claude-code: Code merged in 24962bd (Sonnet implemented, Sonnet reviewed, full suite 195/195). Remaining: owner runs the production data check in the Coolify terminal (DB ports are firewalled), then checks the last criterion.

- 2026-10-22T08:25:14Z claude-code: Review note for the input lock-in: removing only the latitude term from the location match passes every test; add a same-longitude/different-latitude case.

- 2026-10-22T13:45:03Z claude-code: Owner, 2026-10-22: production event_locations has 0 rows with non-finite or out-of-range coordinates.
