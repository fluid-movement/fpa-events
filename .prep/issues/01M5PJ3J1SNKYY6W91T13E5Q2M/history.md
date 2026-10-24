- 2026-10-24T08:58:21Z edited by claude-code: requirement

- 2026-10-24T08:58:41Z edited by claude-code: requirement

- 2026-10-24T09:02:12Z claude-code: Implemented, ready for check: removed the separate migration image (Dockerfile, verify-preparation.mjs, its test, tools/migrate/.dockerignore), shipped tools/migrate in the root .dockerignore with its node_modules excluded, rewrote tools/migrate/README.md to the single Coolify-terminal run, and updated the TTY error message and .env.example comments.
