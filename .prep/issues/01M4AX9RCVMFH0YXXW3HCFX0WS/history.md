- 2026-10-07T11:50:39Z edited by claude-code/opus-5.5: parent

- 2026-10-07T14:42:49Z claude-code/opus-5.5: Migration 0002 tried on the test DB with three seeded rows (attending, organizing, attending) for one user: left only organizing; a new duplicate then fails with 23505. Organizer RSVP test fails with old code and no index (two rows), passes with the fix. Full suite 127 passed / 1 skipped. tools/migrate type-checks; not run (needs a legacy dump).
