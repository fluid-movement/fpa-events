import { test, expect, type APIResponse } from '@playwright/test';
import { getCalendarToken, getTestUserId, deleteUserByEmail, sql, closeDb } from './helpers/db';
import { signUpAndSignIn } from './helpers/auth';
import { TEST_USER } from './helpers/constants';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';

installErrorGuard(test);

/**
 * Output-side defences from the input/output audit that nothing else pins:
 * the headers `handle` adds to every response (`SECURITY_HEADERS`), Kit's CSP
 * from `svelte-options.js`, and the error page an unexpected server fault
 * renders.
 */

/** The `script-src` directive of a CSP header, or null when it has none. */
function scriptSrc(csp: string | undefined): string | null {
	const directive = csp
		?.split(';')
		.map((part) => part.trim())
		.find((part) => part.startsWith('script-src '));
	return directive ?? null;
}

function expectSecurityHeaders(response: APIResponse) {
	const headers = response.headers();
	// Invite and feed URLs carry their token in the path: a Referer may only
	// ever carry the origin to OSM tiles, Turnstile or R2.
	expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
	expect(headers['x-content-type-options']).toBe('nosniff');
}

function expectScriptCsp(response: APIResponse) {
	const directive = scriptSrc(response.headers()['content-security-policy']);
	expect(directive, 'content-security-policy has a script-src').not.toBeNull();
	expect(directive).toContain("'self'");
	// Defence in depth for the rich text RichContent renders with {@html}.
	expect(directive).not.toContain("'unsafe-inline'");
	expect(directive).not.toContain("'unsafe-eval'");
}

test.describe('security headers', () => {
	test.afterAll(async () => {
		await closeDb();
	});

	test('a page response carries the referrer policy, nosniff and a script CSP', async ({
		page
	}) => {
		const response = await page.request.get('/events');
		expect(response.status()).toBe(200);
		expectSecurityHeaders(response);
		expectScriptCsp(response);
	});

	test('an error page carries them too', async ({ page }) => {
		const response = await page.request.get('/events/00000000000000000000000000');
		expect(response.status()).toBe(404);
		expectSecurityHeaders(response);
		expectScriptCsp(response);
	});

	test('the calendar feed carries the referrer policy and nosniff', async ({ page }) => {
		const userId = await getTestUserId(TEST_USER.email);
		await page.goto('/attending');
		await page.waitForLoadState('networkidle');
		const token = await getCalendarToken(userId);
		expect(token, 'visiting /attending should mint a calendar token').toBeTruthy();

		const response = await page.request.get(`/api/calendar/${token}/feed.ics`);
		expect(response.status()).toBe(200);
		expectSecurityHeaders(response);
	});

	test('the calendar feed carries a deny-all CSP', async ({ page }) => {
		const userId = await getTestUserId(TEST_USER.email);
		await page.goto('/attending');
		await page.waitForLoadState('networkidle');
		const token = await getCalendarToken(userId);
		const response = await page.request.get(`/api/calendar/${token}/feed.ics`);
		// Endpoints render nothing, so they get the strictest policy rather than Kit's page CSP.
		expect(response.headers()['content-security-policy']).toBe(
			"default-src 'none'; frame-ancestors 'none'"
		);
	});
});

/**
 * An unexpected fault must show only "Internal Error" and a reference the user
 * can quote — never the Drizzle "Failed query" text with its SQL and params.
 *
 * Driven by a real database failure: a trigger, scoped to a throwaway user,
 * makes the UPDATE in `ensureCalendarToken` raise when `/attending` mints that
 * user's calendar token. This replaces the NUL-in-path trigger the audit used,
 * which `rejectNulPath` now answers with a 400.
 */
test.describe('unexpected server error', () => {
	const suffix = Date.now();
	const credentials = {
		email: `error-page-${suffix}@playwright.local`,
		password: 'error-page-password-123',
		name: 'Error Page User'
	};
	const fn = `playwright_fail_update_${suffix}`;
	const trigger = `playwright_fail_update_${suffix}`;
	const canary = `CANARY_db_detail_${suffix}`;

	test.afterAll(async () => {
		await sql().unsafe(`DROP TRIGGER IF EXISTS ${trigger} ON "user"`);
		await sql().unsafe(`DROP FUNCTION IF EXISTS ${fn}()`);
		await deleteUserByEmail(credentials.email);
		await closeDb();
	});

	test('shows the error reference and no query text', async ({ page, context }) => {
		// The page answers 500, which the browser logs as a failed resource.
		expectConsoleErrors(page);
		await signUpAndSignIn(page, context, credentials);
		const userId = await getTestUserId(credentials.email);
		// Ids come from Better Auth (alphanumeric); checked before interpolating.
		expect(userId).toMatch(/^[A-Za-z0-9_-]+$/);

		await sql().unsafe(
			`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$
			 BEGIN RAISE EXCEPTION '${canary}'; END $$`
		);
		await sql().unsafe(
			`CREATE TRIGGER ${trigger} BEFORE UPDATE ON "user"
			 FOR EACH ROW WHEN (OLD.id = '${userId}') EXECUTE FUNCTION ${fn}()`
		);

		const response = await page.goto('/attending');
		await page.waitForLoadState('networkidle');

		expect(response?.status()).toBe(500);
		await expect(page.getByTestId('error-reference')).toBeVisible();
		await expect(page.getByTestId('error-reference').locator('code')).toHaveText(/^[0-9a-f]{8}$/);
		const html = await page.content();
		expect(html).not.toContain('Failed query');
		expect(html).not.toContain(canary);
		expect(html).not.toMatch(/update\s+"user"/i);
	});
});
