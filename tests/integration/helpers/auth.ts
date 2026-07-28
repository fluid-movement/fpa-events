import { expect, type BrowserContext, type Page } from '@playwright/test';
import { sql } from './db';

export type TestCredentials = { email: string; password: string; name?: string };

/**
 * Signs the browser in as an arbitrary user, creating them first if needed.
 *
 * Most specs run as the shared `TEST_USER` restored from `storageState`. That
 * identity is useless for anything destructive — deleting it would break every
 * later spec in the run — so tests that destroy an account need a throwaway one.
 *
 * Mirrors what `auth.setup.ts` does, including the direct-SQL verification step:
 * better-auth has `requireEmailVerification: true`, so a freshly signed-up user
 * cannot sign in until `email_verified` is set.
 */
export async function signUpAndSignIn(
	page: Page,
	context: BrowserContext,
	{ email, password, name = 'Throwaway User' }: TestCredentials
): Promise<void> {
	await context.clearCookies();

	// Idempotent: better-auth answers 4xx if the user already exists, which is fine.
	await page.request.post('/api/auth/sign-up/email', { data: { email, password, name } });
	await sql()`UPDATE "user" SET email_verified = true WHERE email = ${email}`;

	await signIn(page, context, { email, password });
}

/** Signs in an existing, already-verified user. */
export async function signIn(
	page: Page,
	context: BrowserContext,
	{ email, password }: TestCredentials
): Promise<void> {
	await context.clearCookies();
	const resp = await page.request.post('/api/auth/sign-in/email', { data: { email, password } });
	// Include the body: a bare "false" here is impossible to diagnose, and the
	// interesting failures (unverified email, wrong password) all say why.
	const body = resp.ok() ? '' : ` — ${resp.status()} ${await resp.text()}`;
	expect(resp.ok(), `sign-in failed for ${email}${body}`).toBeTruthy();
	await context.addCookies((await page.request.storageState()).cookies);
}
