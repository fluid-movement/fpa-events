- 2026-10-22T08:16:55Z claude-code: Implemented, ready for check: fpaApiGet takes a required shape guard, refuses redirects and bodies over 2 MiB (declared or streamed); body cap of 2 MiB is my choice

- 2026-10-22T08:21:56Z claude-code: Check passed: redirect manual + 3xx error, Content-Length and streamed cap (timeout signal covers body reads), shapes required by all callers. Mutations: redirect removed and cap removed both fail/hang client.test. check+tests green.
