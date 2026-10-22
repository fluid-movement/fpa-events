src/lib/server/db/index.ts throws at import when DATABASE_URL is unset; Kit imports it during npm run build. Fix: throw only when not building ($app/env), using a placeholder postgres client during build (postgres-js connects lazily).
src/lib/server/production-config.ts assertProductionConfig() must also require DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL in production (not dev, not building); cover each in production-config.test.ts via the app-env-private mock.
Verify with env -i npm run build; if auth.ts fails at import under build, apply the same building-guard pattern there.
