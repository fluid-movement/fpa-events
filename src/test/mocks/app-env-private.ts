// Stands in for the generated `$app/env/private` module under Vitest
// (aliased in vite.config.ts).
//
// SvelteKit 3 exports environment variables as named bindings rather than an
// `env` object, so a test can no longer just assign `env.FOO = 'bar'`. ES
// module exports are live bindings, though, so a `let` reassigned in here is
// immediately visible to the module under test — which is what `setEnv` does.
export const DATABASE_URL: string | undefined = 'postgresql://test';
export const BETTER_AUTH_SECRET: string | undefined = 'test-secret';
export const BETTER_AUTH_URL: string | undefined = 'http://localhost:5173';
export const MAILGUN_API_KEY: string | undefined = undefined;
export const MAILGUN_DOMAIN: string | undefined = undefined;
export const MAILGUN_FROM_EMAIL: string | undefined = undefined;
export const R2_ACCOUNT_ID: string | undefined = 'test-account-id';
export const R2_ACCESS_KEY_ID: string | undefined = 'test-access-key-id';
export const R2_SECRET_ACCESS_KEY: string | undefined = 'test-secret-key';
export const R2_BUCKET_NAME: string | undefined = 'test-bucket';
export const R2_PUBLIC_URL: string | undefined = 'https://test.r2.dev';
export let TURNSTILE_SECRET_KEY: string | undefined = undefined;
export let FPA_API_URL: string | undefined = 'https://fpa-api.test';

/** Override one or more variables for the duration of a test. */
export function setEnv(values: {
	TURNSTILE_SECRET_KEY?: string | undefined;
	FPA_API_URL?: string | undefined;
}) {
	if ('TURNSTILE_SECRET_KEY' in values) TURNSTILE_SECRET_KEY = values.TURNSTILE_SECRET_KEY;
	if ('FPA_API_URL' in values) FPA_API_URL = values.FPA_API_URL;
}
