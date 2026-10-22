import { building, dev } from '$app/env';
import {
	BETTER_AUTH_SECRET,
	BETTER_AUTH_URL,
	DATABASE_URL,
	MAILGUN_API_KEY,
	MAILGUN_DOMAIN,
	TURNSTILE_SECRET_KEY
} from '$app/env/private';

/**
 * Keys without which a production server must not serve. Blank is the dev/test
 * fallback (CAPTCHA off, mail printed to the console) and in production either
 * fallback is a hole: no CAPTCHA, and bearer links written to the logs.
 */
export const REQUIRED_PRODUCTION_KEYS = [
	'TURNSTILE_SECRET_KEY',
	'MAILGUN_API_KEY',
	'MAILGUN_DOMAIN',
	'DATABASE_URL',
	'BETTER_AUTH_SECRET',
	'BETTER_AUTH_URL'
] as const;

type RequiredKey = (typeof REQUIRED_PRODUCTION_KEYS)[number];

/** Names (never values) of the required keys that are unset or blank. */
export function missingProductionKeys(
	values: Record<RequiredKey, string | undefined>
): RequiredKey[] {
	return REQUIRED_PRODUCTION_KEYS.filter((key) => !values[key]?.trim());
}

/**
 * Production means the built server answering requests: not the Vite dev server
 * (`dev`, which is also what `dev:test` runs) and not the build itself
 * (`building`, so compiling never needs a provider secret).
 */
export function isProductionRuntime(): boolean {
	return !dev && !building;
}

/**
 * Throws, naming the keys only, when production is missing any required key.
 * A no-op in dev, test and at build time.
 */
export function assertProductionConfig(): void {
	if (!isProductionRuntime()) return;
	const missing = missingProductionKeys({
		TURNSTILE_SECRET_KEY,
		MAILGUN_API_KEY,
		MAILGUN_DOMAIN,
		DATABASE_URL,
		BETTER_AUTH_SECRET,
		BETTER_AUTH_URL
	});
	if (missing.length > 0) {
		throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
	}
}
