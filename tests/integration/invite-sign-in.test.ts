import { test, expect } from '@playwright/test';
import { ulid } from 'ulid';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	createMagicLink,
	getEventUserStatus,
	sql,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { installErrorGuard } from './helpers/console';

installErrorGuard(test);

/**
 * A co-organizer invite opened while signed out sends the visitor to sign in
 * with `?redirect=/invite/<token>`. Sign-in used to ignore it and always land on
 * the dashboard, so the invite was never accepted.
 */
test.describe('signing in from an invite link', () => {
	const invitee = {
		email: `invitee-${Date.now()}@playwright.local`,
		password: 'invitee-password-123',
		name: 'Invited Organizer'
	};
	let eventId: string;
	let token: string;
	let inviteeId: string;

	test.beforeAll(async ({ request }) => {
		// Better Auth rejects requests without an Origin; the bare `request`
		// fixture, unlike `page.request`, sends none.
		const origin = test.info().project.use.baseURL!;
		const res = await request.post('/api/auth/sign-up/email', {
			data: invitee,
			headers: { origin }
		});
		expect(res.ok(), `sign-up failed: ${res.status()} ${await res.text()}`).toBe(true);
		await sql()`UPDATE "user" SET email_verified = true WHERE email = ${invitee.email}`;
		inviteeId = await getTestUserId(invitee.email);
	});

	test.beforeEach(async ({ context }) => {
		await context.clearCookies();
		const ownerId = await getTestUserId(TEST_USER.email);
		eventId = await createTestEvent(ownerId, { name: 'Invite Sign-in Spec Event' });
		token = await createMagicLink(eventId);
	});

	test.afterEach(async () => {
		await deleteTestEvent(eventId);
	});

	test.afterAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${invitee.email}`;
		await closeDb();
	});

	async function signInThroughForm(page: import('@playwright/test').Page) {
		await page.waitForLoadState('networkidle');
		await page.locator('#email').fill(invitee.email);
		await page.locator('#password').fill(invitee.password);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await page.waitForLoadState('networkidle');
	}

	test('lands back on the invite and waits for acceptance before making the user a co-organizer', async ({
		page
	}) => {
		await page.goto(`/invite/${token}`);
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/sign-in\?redirect=/);

		await signInThroughForm(page);

		await expect(page).toHaveURL(`/invite/${token}`);
		await expect.poll(() => getEventUserStatus(eventId, inviteeId)).toBeNull();
		await page.getByTestId('accept-invite').click();
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(`/events/${eventId}`);
		await expect.poll(() => getEventUserStatus(eventId, inviteeId)).toBe('organizing');
	});

	test('the sign-up link keeps the invite as its destination', async ({ page }) => {
		await page.goto(`/invite/${token}`);
		await page.waitForLoadState('networkidle');

		await expect(page.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
			'href',
			`/sign-up?redirect=${encodeURIComponent(`/invite/${token}`)}`
		);
	});

	// Well-formed, so it passes `storedIdParam` and is looked up: an unknown
	// link must be a 404, not a sign-in redirect and not a crash.
	test('an unknown invite token is a 404', async ({ page }) => {
		const unknown = ulid().toLowerCase();
		const response = await page.goto(`/invite/${unknown}`);
		await page.waitForLoadState('networkidle');

		expect(response?.status()).toBe(404);
		await expect(page).toHaveURL(`/invite/${unknown}`);
		await expect(page.getByText('Page not found')).toBeVisible();
	});

	test('an off-site redirect is ignored', async ({ page }) => {
		await page.goto('/sign-in?redirect=https://evil.example.com/');
		await signInThroughForm(page);

		await expect(page).toHaveURL('/dashboard');
	});
});
