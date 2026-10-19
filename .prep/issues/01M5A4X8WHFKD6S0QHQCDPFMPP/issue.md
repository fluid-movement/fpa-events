---
title: Legacy import keeps mixed-case emails, which Better Auth can never match
kind: code
parent: 01M5A45SJ0DTHEX1G0R86JKXEJ
tags:
  - security
priority: high
---

Finding from the untrusted-upstream-data audit (01M5A45SJ0DTHEX1G0R86JKXEJ).

**Vulnerability.** The legacy import copies `users.email` verbatim (`tools/migrate/src/migrate.ts:98-102`). Better Auth lowercases the address before every lookup (`findUserByEmail` in `better-auth/dist/db/internal-adapter.mjs:568-573`, called from sign-in and password reset; sign-up stores `email.toLowerCase()`), and `user.email` is unique case-sensitively (`src/lib/server/db/schema.ts:17`). Any legacy row whose email has an uppercase letter or surrounding whitespace therefore:

- cannot sign in, and never receives a password-reset mail (the lookup misses), so the account and its events, RSVPs and organizer seats are locked out;
- can be shadowed: anyone can sign up with the lowercased address and get a second, separate user for the same mailbox (verification still gates sign-in, so the mailbox owner ends up with two identities, the new one holding none of the legacy data).

Two legacy rows that differ only by case would also collide once lowercased, which the tool does not detect.

**Reproduce.** In a scratch target DB, give a legacy user an address like `Someone@Example.org`, run `npm run migrate`, then try to sign in or request a reset with any casing of that address: sign-in fails as "invalid email or password" and no reset link is logged. Sign-up with the lowercased address then succeeds.

**Could not check.** No legacy dump is available locally (only the production legacy DB, which is firewalled), so I could not count affected rows. Laravel Breeze's registration and profile rules include `lowercase`, so the number may be zero, but older or hand-edited rows are not covered by that.

**Severity.** Medium (account lockout / split identity for affected users; no takeover).

**Blocks go-live?** It should be fixed, or the dry run shown to report zero affected rows, before the final legacy migration (01M4B48HENZTKHQ88QZ83E0EBH), because a fix after cutover means repairing live accounts by hand.

## Open questions
