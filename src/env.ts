import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * SvelteKit 3 replaced the `$env/*` modules with `$app/env/private` and
 * `$app/env/public`, populated from this file.
 *
 * Every variable is declared with `schema: (value) => value`, which keeps the
 * type as `string | undefined` and lets it be missing. That is deliberate: it
 * is exactly what `$env/dynamic/*` used to hand back, and every consumer
 * already treats "unset" and "blank" as the same thing — `email.ts` falls back
 * to logging, `turnstile.ts` short-circuits to `true`, `r2.ts` builds its
 * client with `?? ''`, and `db/index.ts` throws its own message. Declaring
 * them as required instead would move those failures to app startup and break
 * `.env.test`, which blanks most of them on purpose.
 *
 * None are `static`, so all are read from the environment at runtime rather
 * than inlined at build time — `FPA_API_URL` in particular is deliberately
 * runtime-configured.
 */
export const variables = defineEnvVars({
	DATABASE_URL: {
		schema: (value) => value,
		description: 'Postgres connection string. Required; db/index.ts throws without it.'
	},
	BETTER_AUTH_SECRET: {
		schema: (value) => value,
		description: 'Signs Better Auth sessions.'
	},
	BETTER_AUTH_URL: {
		schema: (value) => value,
		description: 'Origin Better Auth validates requests against. Must match the serving port.'
	},
	MAILGUN_API_KEY: {
		schema: (value) => value,
		description: 'Blank in dev/test, which makes email.ts log to the console instead of sending.'
	},
	MAILGUN_DOMAIN: { schema: (value) => value },
	MAILGUN_FROM_EMAIL: { schema: (value) => value },
	R2_ACCOUNT_ID: { schema: (value) => value },
	R2_ACCESS_KEY_ID: { schema: (value) => value },
	R2_SECRET_ACCESS_KEY: { schema: (value) => value },
	R2_BUCKET_NAME: { schema: (value) => value },
	R2_PUBLIC_URL: { schema: (value) => value },
	TURNSTILE_SECRET_KEY: {
		schema: (value) => value,
		description: 'Blank disables captcha verification (verifyTurnstile returns true).'
	},
	FPA_API_URL: {
		schema: (value) => value,
		description: 'Read-only rankings/results API. Unset shows an "unavailable" notice.'
	},
	PUBLIC_TURNSTILE_SITE_KEY: {
		public: true,
		schema: (value) => value,
		description: 'Blank hides the Turnstile widget.'
	}
});
