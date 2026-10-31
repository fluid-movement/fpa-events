Files: new compose.yaml, docker/postgres/init.sql (or .sh), justfile; edit .env.example, .env.test (DATABASE_URL currently postgres://<user>@localhost:5432/fpa_events_test — align with compose credentials), README.md (local setup ~lines 18-35, test DB ~lines 125-137, troubleshooting ~207), AGENTS.md ('Integration tests use their own database' one-time setup block).
Gotcha: README says drizzle-kit reads DATABASE_URL from the shell, not .env — so the justfile must use 'set dotenv-load' (or export it) before npm run db:migrate / db:seed; test recipes already go through dotenv-cli.
Seed-empty check: schema.ts defines pgTable('user') — count rows in "user" via docker compose exec psql.
Rex: run 'rex skill show' for the CLI to open a pane running npm run dev in the current session (REX_SESSION env var).
Kit 3 / vp notes do not matter here: no app code changes.
