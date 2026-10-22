import { test, expect, type Page } from '@playwright/test';
import { createEmailVerificationToken } from 'better-auth/api';
import { getSessionIds, sql } from './helpers/db';
import { expectSessionAccess, signIn, signUpAndSignIn } from './helpers/auth';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';

installErrorGuard(test);

const RESET_PREFIX = 'reset-password:';

/** The pending reset-token rows for an address, as the real reset request wrote them. */
const resetTokens = (email: string) => sql()<{ identifier: string }[]>`
	SELECT v.identifier FROM verification v JOIN "user" u ON u.id = v.value
	WHERE v.identifier LIKE ${RESET_PREFIX + '%'} AND u.email = ${email}
`;

/** Asks the real endpoint for a reset link and reads the token it stored. */
async function requestResetToken(page: Page, email: string): Promise<string> {
	const sent = await page.request.post('/api/auth/request-password-reset', {
		data: { email, redirectTo: '/reset-password' }
	});
	expect(sent.ok()).toBeTruthy();
	await expect.poll(async () => (await resetTokens(email)).length).toBe(1);
	const [row] = await resetTokens(email);
	return row.identifier.slice(RESET_PREFIX.length);
}

const resetPassword = (page: Page, token: string, newPassword: string) =>
	page.request.post('/api/auth/reset-password', { data: { token, newPassword } });

/** Status of a sign-in attempt from a clean jar: a leftover cookie would demand an Origin. */
const trySignIn = async (page: Page, email: string, password: string) => {
	await page.context().clearCookies();
	return (
		await page.request.post('/api/auth/sign-in/email', { data: { email, password } })
	).status();
};

const sessionCount = async (email: string) => (await getSessionIds(email)).length;

test('password reset revokes both existing sessions and replaces the credential', async ({
	page,
	context
}) => {
	expectConsoleErrors(page);
	const email = `reset-sessions-${crypto.randomUUID()}@playwright.local`;
	const password = 'reset-sessions-original-1';
	const newPassword = 'reset-sessions-replacement-1';

	try {
		await signUpAndSignIn(page, context, { email, password });
		const firstCookies = await context.cookies();
		await expectSessionAccess(page, context, firstCookies, true);
		await signIn(page, context, { email, password });
		const secondCookies = await context.cookies();
		await expectSessionAccess(page, context, secondCookies, true);
		await expect.poll(() => getSessionIds(email)).toHaveLength(2);

		await context.clearCookies();
		await page.goto('/forget-password');
		await page.waitForLoadState('networkidle');
		await page.getByLabel('Email').fill(email);
		await page.getByRole('button', { name: 'Send reset link' }).click();
		await page.waitForLoadState('networkidle');
		await expect(page.getByText(/check your inbox|sent/i)).toBeVisible();

		// Read the token created by the real reset request; no synthetic verification row.
		await expect.poll(async () => (await resetTokens(email)).length).toBe(1);
		const token = (await resetTokens(email))[0].identifier.slice(RESET_PREFIX.length);
		await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
		await page.waitForLoadState('networkidle');
		await page.getByLabel('New Password').fill(newPassword);
		await page.getByLabel('Confirm Password').fill(newPassword);
		await page.getByRole('button', { name: 'Reset password' }).click();
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/sign-in/);

		await expect.poll(() => getSessionIds(email)).toEqual([]);
		await expectSessionAccess(page, context, firstCookies, false);
		await expectSessionAccess(page, context, secondCookies, false);

		await context.clearCookies();
		const rejected = await page.request.post('/api/auth/sign-in/email', {
			data: { email, password }
		});
		expect(rejected.status()).toBe(401);
		await expect.poll(() => getSessionIds(email)).toEqual([]);
		await signIn(page, context, { email, password: newPassword });
		await expectSessionAccess(page, context, await context.cookies(), true);
	} finally {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	}
});

test.describe('password reset tokens', () => {
	const password = 'reset-tokens-original-1';
	let email: string;

	test.beforeEach(async ({ page, context }) => {
		email = `reset-token-${crypto.randomUUID()}@playwright.local`;
		await signUpAndSignIn(page, context, { email, password });
		await context.clearCookies();
	});

	test.afterEach(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	});

	test('an expired token is refused and the credential is unchanged', async ({ page }) => {
		const token = await requestResetToken(page, email);
		// Days, not minutes: the column is a timestamp without time zone, so the
		// machine's UTC offset shifts what "a minute ago" means to the app.
		await sql()`
			UPDATE verification SET expires_at = now() - interval '3 days'
			WHERE identifier = ${RESET_PREFIX + token}
		`;

		const response = await resetPassword(page, token, 'expired-token-pw-1');

		expect(response.status()).toBe(400);
		expect(await trySignIn(page, email, 'expired-token-pw-1')).toBe(401);
		expect(await trySignIn(page, email, password)).toBe(200);
	});

	test('a token cannot be used twice', async ({ page }) => {
		const token = await requestResetToken(page, email);

		expect((await resetPassword(page, token, 'first-use-pw-1')).status()).toBe(200);
		await expect.poll(async () => (await resetTokens(email)).length).toBe(0);
		expect((await resetPassword(page, token, 'second-use-pw-1')).status()).toBe(400);

		expect(await trySignIn(page, email, 'second-use-pw-1')).toBe(401);
		expect(await trySignIn(page, email, 'first-use-pw-1')).toBe(200);
	});

	test('two simultaneous uses of one token succeed exactly once', async ({ page }) => {
		const token = await requestResetToken(page, email);
		const candidates = ['racing-pw-alpha-1', 'racing-pw-bravo-1'];

		const responses = await Promise.all(candidates.map((pw) => resetPassword(page, token, pw)));

		expect(responses.map((r) => r.status()).sort()).toEqual([200, 400]);
		await expect.poll(async () => (await resetTokens(email)).length).toBe(0);
		const winners = [];
		for (const pw of candidates) if ((await trySignIn(page, email, pw)) === 200) winners.push(pw);
		expect(winners).toEqual([candidates[responses.findIndex((r) => r.ok())]]);
		expect(await trySignIn(page, email, password)).toBe(401);
	});
});

test.describe('email verification links', () => {
	const secret = process.env.BETTER_AUTH_SECRET!;
	let email: string;
	const password = 'verify-links-original-1';

	test.beforeEach(() => {
		email = `verify-link-${crypto.randomUUID()}@playwright.local`;
	});

	test.afterEach(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	});

	const verify = (page: Page, token: string) =>
		page.request.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
			maxRedirects: 0
		});
	const issuedCookie = (headers: Record<string, string>) => headers['set-cookie'] ?? null;
	const userRow = async () =>
		(
			await sql()<{ email_verified: boolean; role: string; id: string; name: string }[]>`
				SELECT email_verified, role, id, name FROM "user" WHERE email = ${email}
			`
		)[0];

	test('signing up cannot grant verification or a role, and unverified accounts get no session', async ({
		page,
		context
	}) => {
		expectConsoleErrors(page);
		await context.clearCookies();

		const signUp = await page.request.post('/api/auth/sign-up/email', {
			data: { email, password, name: 'Direct Post', emailVerified: true, role: 'admin' }
		});
		expect(signUp.ok()).toBeTruthy();
		expect((await signUp.json()).token).toBeNull();
		expect(issuedCookie(signUp.headers())).toBeNull();
		await expect.poll(async () => (await userRow())?.email_verified).toBe(false);
		expect((await userRow()).role).toBe('user');

		// Right password, unverified: refused, and nothing was issued.
		const signIn = await page.request.post('/api/auth/sign-in/email', {
			data: { email, password }
		});
		expect(signIn.status()).toBe(403);
		expect(issuedCookie(signIn.headers())).toBeNull();
		await expect.poll(() => sessionCount(email)).toBe(0);
		await page.goto('/settings/password');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
	});

	test('a duplicate sign-up looks like a new one and exposes nothing about the stored account', async ({
		page,
		context
	}) => {
		await context.clearCookies();
		const first = await page.request.post('/api/auth/sign-up/email', {
			data: { email, password, name: 'Original Owner' }
		});
		await expect.poll(async () => (await userRow())?.name).toBe('Original Owner');
		const stored = await userRow();
		await sql()`UPDATE "user" SET email_verified = true WHERE email = ${email}`;

		const duplicate = await page.request.post('/api/auth/sign-up/email', {
			data: { email, password: 'attacker-password-1', name: 'Attacker' }
		});

		expect(duplicate.status()).toBe(first.status());
		const [a, b] = [await first.json(), await duplicate.json()];
		expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort());
		expect(Object.keys(b.user).sort()).toEqual(Object.keys(a.user).sort());
		expect(b.token).toBeNull();
		expect(issuedCookie(duplicate.headers())).toBeNull();
		expect(b.user.id).not.toBe(stored.id);
		expect(b.user.name).toBe('Attacker');
		expect(b.user.emailVerified).toBe(false);
		// Nothing was written and the original credential still works.
		expect((await userRow()).name).toBe('Original Owner');
		expect(await trySignIn(page, email, 'attacker-password-1')).toBe(401);
		expect(await trySignIn(page, email, password)).toBe(200);
	});

	test('only a valid, unexpired, signed link verifies and signs in, and it works once', async ({
		page,
		context
	}) => {
		expectConsoleErrors(page);
		await context.clearCookies();
		await page.request.post('/api/auth/sign-up/email', {
			data: { email, password, name: 'Link Tester' }
		});
		await expect.poll(async () => (await userRow())?.email_verified).toBe(false);

		const refused = [
			['malformed', 'not-a-token'],
			['signed with another key', await createEmailVerificationToken('x'.repeat(40), email)],
			['expired', await createEmailVerificationToken(secret, email, undefined, -60)]
		] as const;
		for (const [label, token] of refused) {
			const response = await verify(page, token);
			expect(response.status(), label).toBe(401);
			expect(issuedCookie(response.headers()), label).toBeNull();
		}
		expect((await userRow()).email_verified).toBe(false);
		expect(await sessionCount(email)).toBe(0);

		// The genuine link verifies the account and signs the browser in.
		const token = await createEmailVerificationToken(secret, email);
		const ok = await verify(page, token);
		expect(ok.status()).toBeLessThan(400);
		expect(issuedCookie(ok.headers())).toContain('session_token');
		await expect.poll(async () => (await userRow()).email_verified).toBe(true);
		await expect.poll(() => sessionCount(email)).toBe(1);
		await context.addCookies((await page.request.storageState()).cookies);
		await page.goto('/settings/password');
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/settings\/password$/);

		// Replaying it, from a fresh browser, mints nothing.
		await context.clearCookies();
		const replay = await verify(page, token);
		expect(issuedCookie(replay.headers())).toBeNull();
		await expect.poll(() => sessionCount(email)).toBe(1);
	});
});

test.describe('session lifetime', () => {
	let email: string;

	test.beforeEach(() => {
		email = `session-end-${crypto.randomUUID()}@playwright.local`;
	});

	test.afterEach(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	});

	test('a cookie captured before sign-out stops working after it', async ({ page, context }) => {
		await signUpAndSignIn(page, context, { email, password: 'sign-out-replay-1' });
		const captured = await context.cookies();
		await expectSessionAccess(page, context, captured, true);

		// Better Auth refuses a cookie-bearing POST that carries no Origin.
		const origin = new URL(test.info().project.use.baseURL!).origin;
		const signOut = await page.request.post('/api/auth/sign-out', {
			data: {},
			headers: { origin }
		});
		expect(signOut.ok()).toBeTruthy();
		await expect.poll(() => getSessionIds(email)).toEqual([]);

		await expectSessionAccess(page, context, captured, false);
		const current = await page.request.get('/api/auth/get-session');
		expect(await current.json()).toBeNull();
	});

	test('a cookie whose session has expired stops working', async ({ page, context }) => {
		await signUpAndSignIn(page, context, { email, password: 'expired-session-1' });
		const captured = await context.cookies();
		await expectSessionAccess(page, context, captured, true);

		await sql()`
			UPDATE session SET expires_at = now() - interval '3 days'
			WHERE user_id = (SELECT id FROM "user" WHERE email = ${email})
		`;

		await expectSessionAccess(page, context, captured, false);
	});
});

test.describe('sign-up email verification flow', () => {
	test.describe.configure({ mode: 'serial' });
	const email = 'verify-flow-test@playwright.local';
	const password = 'test-pw-verify-123';

	test.beforeAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	});

	test.afterAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	});

	test('shows activation prompt after sign-up with unverified email', async ({ page }) => {
		await page.goto('/sign-up');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('First name').fill('Verify');
		await page.getByLabel('Last name').fill('Test');
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Create account' }).click();

		await expect(page.getByText(/verification email/i)).toBeVisible();
	});

	test('does not leak email existence on re-registration', async ({ page }) => {
		// Sign up again with the same email — should show same message
		await page.goto('/sign-up');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('First name').fill('Verify');
		await page.getByLabel('Last name').fill('Test');
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Create account' }).click();
		await page.waitForLoadState('networkidle');

		await expect(page.getByText(/verification email/i)).toBeVisible();
	});

	test('cannot sign in with unverified email', async ({ page }) => {
		await page.goto('/sign-in');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await page.waitForTimeout(2000);

		await expect(page.getByText(/verify/i)).toBeVisible();
	});

	test('can sign in after verifying email', async ({ page }) => {
		// Manually verify the email (simulates clicking the verification link)
		await sql()`UPDATE "user" SET email_verified = true WHERE email = ${email}`;

		await page.goto('/sign-in');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Sign in' }).click();

		await page.waitForURL(/\/dashboard/, { timeout: 15000 });
		await expect(page).toHaveURL(/\/dashboard/);
	});
});

test.describe('resend verification flow', () => {
	test.describe.configure({ mode: 'serial' });
	const email = 'resend-test@playwright.local';
	const password = 'test-pw-resend-123';

	test.beforeAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	});

	test.afterAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	});

	test('shows resend verification button after failed sign-in', async ({ page, context }) => {
		await context.clearCookies();

		// Sign up
		await page.goto('/sign-up');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('First name').fill('Resend');
		await page.getByLabel('Last name').fill('Test');
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Create account' }).click();
		await expect(page.getByText(/verification email/i)).toBeVisible();

		// Navigate to sign-in page
		await page.goto('/sign-in');

		// Attempt sign-in with unverified email
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await page.waitForLoadState('networkidle');

		// Check that a resend verification button is visible
		const resendBtn = page.getByRole('button', { name: /resend.*verification/i });
		await expect(resendBtn).toBeVisible();

		// Click resend
		await resendBtn.click();
		await page.waitForLoadState('networkidle');
		await expect(page.getByText(/verification email sent|sent/i)).toBeVisible();
	});
});

test.describe('forgot-password flow', () => {
	test.describe.configure({ mode: 'serial' });
	const email = 'forgot-pw-test@playwright.local';
	const newPassword = 'new-pw-forgot-456';

	test.beforeAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
		const id = 'forgot-pw-' + Date.now();
		await sql()`
			INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
			VALUES (${id}, 'Forgot PW Test', ${email}, true, 'user', now(), now())
		`;
	});

	test.afterAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
	});

	test('shows success message after requesting reset link', async ({ page, context }) => {
		await context.clearCookies();

		await page.goto('/forget-password');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('Email').fill(email);
		await page.getByRole('button', { name: 'Send reset link' }).click();
		await page.waitForLoadState('networkidle');

		await expect(page.getByText(/check your inbox|sent/i)).toBeVisible();
	});

	test('can reset password and sign in with new password', async ({ page, context }) => {
		await context.clearCookies();

		// Request a password reset via the client (which uses the correct API endpoint)
		await page.goto('/forget-password');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('Email').fill(email);
		await page.getByRole('button', { name: 'Send reset link' }).click();
		await page.waitForLoadState('networkidle');

		// Extract the verification token from the table
		const [row] = await sql()<[{ identifier: string }]>`
			SELECT v.identifier FROM verification v
			JOIN "user" u ON u.id = v.value
			WHERE v.identifier LIKE 'reset-password:%' AND u.email = ${email}
			ORDER BY v.created_at DESC LIMIT 1
		`;
		expect(row).toBeTruthy();
		const token = row.identifier.replace('reset-password:', '');
		expect(token).toBeTruthy();

		// Reset the password using the token
		await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
		await page.waitForLoadState('networkidle');

		await page.getByLabel('New Password').fill(newPassword);
		await page.getByLabel('Confirm Password').fill(newPassword);
		await page.getByRole('button', { name: 'Reset password' }).click();
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveURL(/\/sign-in/);

		// Sign in with the new password
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(newPassword);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveURL(/\/dashboard/);
	});
});
