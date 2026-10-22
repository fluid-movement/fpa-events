- 2026-10-22T08:16:55Z claude-code: Implemented, ready for check: id args use a UUID validator (strictest documented format) so ./.. never reach fpaApiGet, and browser errors are a fixed message with detail logged server-side

- 2026-10-22T08:21:56Z claude-code: Check passed: all 3 remote queries use fpaId (UUID, matches integration fixtures); only upstream paths from user input are these ids (series is encoded query value, allow-listed). Mutation (fpaId always true) fails validation.test. attempt() returns fixed message; check+vp test 703 green.
