# Local development entry points. Run `just` to list them; `just up` brings everything up.
# Recipes starting with `_` are helpers and stay out of the list.

# Load .env into every recipe. Recipes that run before .env exists call
# `just <recipe>` as a subprocess so they pick it up.
set dotenv-load

default:
    @just --list

# Start OrbStack if Docker is down, or fail with a clear message.
_docker:
    #!/usr/bin/env bash
    set -euo pipefail
    if docker info >/dev/null 2>&1; then
        exit 0
    fi
    if ! command -v orb >/dev/null 2>&1; then
        echo "Docker is not running and the OrbStack 'orb' command is missing. Start OrbStack (or another Docker engine) and rerun just up." >&2
        exit 1
    fi
    echo "Docker is not running; starting OrbStack..."
    orb start || { echo "orb start failed. Start OrbStack manually and rerun just up." >&2; exit 1; }
    for _ in $(seq 1 60); do
        if docker info >/dev/null 2>&1; then
            exit 0
        fi
        sleep 1
    done
    echo "OrbStack started but Docker is still not reachable." >&2
    exit 1

# Create .env from .env.example with a generated secret. Never overwrites an existing .env.
_env:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -f .env ]; then
        exit 0
    fi
    secret=$(openssl rand -base64 32)
    awk -v secret="$secret" '/^BETTER_AUTH_SECRET=/ { print "BETTER_AUTH_SECRET=" secret; next } { print }' .env.example > .env.tmp
    mv .env.tmp .env
    echo "Created .env from .env.example with a generated BETTER_AUTH_SECRET."

# Start the compose Postgres and wait for its healthcheck.
_db: _docker
    #!/usr/bin/env bash
    set -euo pipefail
    listeners=$(lsof -nP -iTCP:5432 -sTCP:LISTEN 2>/dev/null || true)
    running=$(docker compose -f compose.dev.yaml ps --status running -q postgres)
    if [ -n "$listeners" ] && [ -z "$running" ]; then
        holder=$(printf '%s\n' "$listeners" | awk 'NR > 1 { print $1 }' | sort -u | paste -sd, -)
        echo "Port 5432 is already held by: $holder" >&2
        echo "That is most likely DBngin's Postgres. Stop it in DBngin, then rerun just up." >&2
        exit 1
    fi
    docker compose -f compose.dev.yaml up -d --wait

# Install dependencies only when node_modules is missing or older than package-lock.json.
_deps:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; then
        npm install
    fi

_migrate:
    npm run db:migrate

# Seed only when the dev database has no users (the seed deletes and rewrites its own rows).
_seed-if-empty:
    #!/usr/bin/env bash
    set -euo pipefail
    users=$(docker compose -f compose.dev.yaml exec -T postgres psql -U user -d fpa_events -tAc 'select count(*) from "user"' | tr -d '[:space:]')
    if [ "$users" = "0" ]; then
        npm run db:seed
    else
        echo "Dev database already has $users user(s); skipping seed."
    fi

# Dev server: reuse one already on 5173, else start it in a Rex pane or the foreground.
_server:
    #!/usr/bin/env bash
    set -euo pipefail
    if lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
        echo "A server is already listening on http://localhost:5173; not starting another."
        exit 0
    fi
    if [ -n "${REX_SESSION:-}" ] && [ -n "${REX_BLOCK:-}" ]; then
        rex split -s "$REX_SESSION" -b "$REX_BLOCK" --split=right --label Dev --keep-open --focus=false -c "$PWD" -- npm run dev
        echo "Dev server starting in a Rex pane: http://localhost:5173"
    elif [ -n "${REX_SESSION:-}" ]; then
        rex window new -s "$REX_SESSION" Dev -c "$PWD" --keep-open --focus=false -- npm run dev
        echo "Dev server starting in a Rex tab: http://localhost:5173"
    else
        exec npm run dev
    fi

# Bring up the whole local dev environment. Safe to rerun.
up: _env _db _deps
    just _migrate _seed-if-empty _server

# Stop the local services. Data is kept.
down:
    docker compose -f compose.dev.yaml down

# Wipe the local dev database and start again from the seed.
reset:
    #!/usr/bin/env bash
    set -euo pipefail
    read -r -p "This deletes all local dev data in the postgres-data volume. Type 'reset' to continue: " answer
    if [ "$answer" != "reset" ]; then
        echo "Aborted."
        exit 1
    fi
    docker compose -f compose.dev.yaml down -v
    just _env
    just _db _deps _migrate _seed-if-empty

# Open an interactive psql on the dev database.
psql: _db
    docker compose -f compose.dev.yaml exec postgres psql -U user -d fpa_events

# env -i drops the .env variables dotenv-load exported, so .env.test (via dotenv-cli) is what applies.
[doc('Migrate and seed the integration-test database (fpa_events_test).')]
test-db: _db _deps
    env -i HOME="$HOME" PATH="$PATH" npm run db:reset:test
