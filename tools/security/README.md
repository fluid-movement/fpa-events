# Failed sign-in timing

`src/lib/server/sign-in-timing.ts` wraps the application's Better Auth HTTP
handler in `src/hooks.server.ts`. A POST to `/api/auth/sign-in/email` returning
401 waits until at least roughly 1000 ms have elapsed in that handler. The timer
uses the monotonic clock. Unknown emails, missing credential accounts, missing
passwords, wrong scrypt passwords, and wrong legacy bcrypt passwords receive the
same existing Better Auth error body.

The added delay is one asynchronous wait of 0–1000 ms. There is no extra password
hash, busy loop, input-dependent budget, global queue, or per-account state.
Successful requests, validation failures, CAPTCHA responses, and rate-limit
responses are passed through unchanged. Existing CAPTCHA and rate limits still
run before the response is padded. This bounds added work and retained request
time; it does not impose a new limit on concurrent connections or on the existing
hash computation.

The one-second floor targets scrypt and typical bcrypt costs 4–13 on the measured
machine. All previously supported bcrypt prefixes (`$2a$`, `$2b$`, `$2y$`) and
stored costs remain compatible. Hashes are not upgraded on login. In particular,
we do not reject a valid legacy password solely because its stored work factor is
high. Slower hardware, higher costs, event-loop contention, and database delays
can exceed the floor and remain distinguishable. Timer scheduling also introduces
small differences. This is bounded mitigation, not constant-time authentication.

## Reproduce the synthetic experiment

From the repository root, with the existing dependencies and a Node version that
supports TypeScript stripping:

```sh
node tools/security/sign-in-timing.mts
```

The script uses the real Better Auth handler, the application's password verifier,
real bcrypt/scrypt hashes, an in-memory adapter, and only `example.invalid`
addresses. It opens no network connections and touches no database or production
accounts. Each case gets a warmup, then five samples per mode with rotating case
order. Baseline and padded runs have the same public 401 response. The high-cost
case deliberately exposes the fixed floor's limit. Results are diagnostic, not a
CI threshold or a claim about deployed enumeration accuracy.

Regression tests use controlled hash costs and clocks instead of timing the host:
`src/lib/server/sign-in-timing.test.ts` exercises the real Better Auth failure
branches and bounds; `src/hooks.server.test.ts` proves the HTTP boundary awaits
padding independently for concurrent attempts. `password.test.ts` retains the
real-hash compatibility checks.

## Recorded run (2026-10-21)

Node 24.22.0, Apple M1, installed Better Auth 1.7.7. The lockfile targets 1.7.8;
this experiment did not install or change dependencies. These local samples are
small and include host-load variation.

| Case             | Baseline median (range), ms | Padded median (range), ms |
| ---------------- | --------------------------- | ------------------------- |
| Unknown email    | 58.5 (58.0–101.0)           | 1000.6 (1000.4–1001.0)    |
| No account       | 100.8 (58.6–102.2)          | 1000.8 (1000.3–1001.3)    |
| Missing password | 101.5 (80.2–102.6)          | 1000.8 (1000.1–1001.4)    |
| Scrypt           | 100.6 (62.2–105.5)          | 1000.6 (999.5–1000.9)     |
| Bcrypt $2a$, 10  | 112.6 (72.8–113.1)          | 1001.0 (1000.8–1001.1)    |
| Bcrypt $2b$, 12  | 318.7 (292.6–321.1)         | 1000.3 (1000.3–1001.2)    |
| Bcrypt $2y$, 13  | 591.6 (556.2–594.8)         | 1001.0 (1000.3–1001.3)    |
| Bcrypt $2y$, 14  | 1145.1 (1109.6–1157.8)      | 1102.6 (1101.9–1156.3)    |

The padded medians through cost 13 span 0.7 ms, compared with hundreds of
milliseconds before padding. Cost 14 still exceeds the floor by roughly 100–150
ms and remains distinguishable in this experiment. Higher costs remain compatible
but receive no extra delay once they exceed the floor. Controlled tests cover
cost 31 without actually doing its prohibitively expensive work. Production hash
costs have not been inspected; an owner can assess the real distribution and host
performance before choosing a different fixed floor in a separate change.
