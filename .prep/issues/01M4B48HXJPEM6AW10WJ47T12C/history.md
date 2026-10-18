- 2026-10-18T15:25:27Z edited by claude-code: requirement

- 2026-10-18T15:28:54Z claude-code: Implemented, ready for check: deleteAccount now requires the current password (verified with Better Auth configured verifier, bcrypt-safe), wrong password shows a form issue; dialog has a password input; integration tests cover wrong and right password.

- 2026-10-18T15:30:38Z claude-code: Check passed. Follow-ups: rename field to _password so Kit redacts it from echoed input; no rate limit on repeated wrong passwords; no integration test with a bcrypt account via the form (unit test covers verifier).
