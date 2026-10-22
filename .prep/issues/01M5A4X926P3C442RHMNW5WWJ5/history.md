- 2026-10-22T08:16:56Z claude-code: Implemented, ready for check: calendar name has C0/DEL controls replaced before ical-generator, feed building moved to src/lib/server/calendar-feed.ts with unit tests

- 2026-10-22T08:21:56Z claude-code: Check passed: C0+DEL stripped from calendar name; SUMMARY/LOCATION/DESCRIPTION escaped by ical-generator (verified incl. U+2028). Mutation (strip removed) fails calendar-feed.test. Nit: NAME not TEXT-escaped for ; , \ (not injection).
