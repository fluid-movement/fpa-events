import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { TEST_USER } from './helpers/constants';
import {
	getTestUserId,
	createTestUser,
	deleteTestUser,
	createTestEvent,
	deleteTestEvent,
	eventExists,
	getScheduleCount,
	setUserRole,
	closeDb
} from './helpers/db';

async function signIn(page: Page, context: BrowserContext) {
	await context.clearCookies();
	const resp = await page.request.post('/api/auth/sign-in/email', {
		data: { email: TEST_USER.email, password: 'playwright-test-pw-123' }
	});
	expect(resp.ok()).toBeTruthy();
	const state = await page.request.storageState();
	await context.addCookies(state.cookies);
}

// SvelteKit form actions always return HTTP 200; failures are in the response body.
// Use this to check the action's logical status.
async function postAction(
	page: Page,
	url: string,
	formData: Record<string, string> = {}
): Promise<{ status: number; type: string }> {
	const response = await page.request.post(url, { form: formData });
	const body = await response.json().catch(() => ({}));
	// On redirect (e.g. successful action), body may not be JSON
	return { status: body.status ?? response.status(), type: body.type ?? 'unknown' };
}

test.describe('admin role — authorization', () => {
	let userId: string;
	let otherUserId: string;
	let ownEventId: string;
	let otherEventId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
		otherUserId = await createTestUser('other@playwright.local', 'Other Test User');
		ownEventId = await createTestEvent(userId, { name: 'Auth Test - Own Event' });
		otherEventId = await createTestEvent(otherUserId, { name: 'Auth Test - Other Event' });
	});

	test.afterAll(async () => {
		await setUserRole(userId, 'user');
		await deleteTestEvent(ownEventId);
		await deleteTestEvent(otherEventId);
		await deleteTestUser(otherUserId);
		await closeDb();
	});

	// ─── UI access guards ──────────────────────────────────────────────────────

	test('regular user is redirected away from another users admin page', async ({
		page,
		context
	}) => {
		await setUserRole(userId, 'user');
		await signIn(page, context);
		await page.goto(`/events/${otherEventId}/admin`);
		await expect(page).not.toHaveURL(/\/admin$/);
	});

	test('unauthenticated user is redirected to sign-in from admin page', async ({
		page,
		context
	}) => {
		await context.clearCookies();
		await page.goto(`/events/${otherEventId}/admin`);
		await expect(page).toHaveURL(/sign-in/);
	});

	test('regular user cannot see Edit/Manage buttons on events they do not own', async ({
		page,
		context
	}) => {
		await setUserRole(userId, 'user');
		await signIn(page, context);
		await page.goto(`/events/${otherEventId}`);
		await expect(page.getByRole('link', { name: 'Edit' })).not.toBeVisible();
		await expect(page.getByRole('link', { name: 'Manage' })).not.toBeVisible();
	});

	test('admin can access admin page of any event', async ({ page, context }) => {
		await setUserRole(userId, 'admin');
		await signIn(page, context);
		await page.goto(`/events/${otherEventId}/admin`);
		await expect(page).toHaveURL(/\/admin$/);
	});

	test('admin sees Edit and Manage buttons on any event', async ({ page, context }) => {
		await setUserRole(userId, 'admin');
		await signIn(page, context);
		await page.goto(`/events/${otherEventId}`);
		await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Manage' })).toBeVisible();
	});

	// ─── Direct action POST bypass attempts ────────────────────────────────────
	// SvelteKit form actions always return HTTP 200; failures are encoded in the
	// body as { type: "failure", status: N }. We verify both the failure response
	// AND that the DB was not mutated.

	test('non-admin non-owner gets 403 and event is not deleted', async ({ page, context }) => {
		await setUserRole(userId, 'user');
		await signIn(page, context);

		const result = await postAction(page, `/events/${otherEventId}/admin?/deleteEvent`);
		expect(result.type).toBe('failure');
		expect(result.status).toBe(403);
		expect(await eventExists(otherEventId)).toBe(true);
	});

	test('unauthenticated user gets 401 and event is not deleted', async ({ page, context }) => {
		await context.clearCookies();

		const result = await postAction(page, `/events/${otherEventId}/admin?/deleteEvent`);
		expect(result.type).toBe('failure');
		expect(result.status).toBe(401);
		expect(await eventExists(otherEventId)).toBe(true);
	});

	test('non-admin non-owner gets 403 and schedule is not inserted', async ({ page, context }) => {
		await setUserRole(userId, 'user');
		await signIn(page, context);

		const before = await getScheduleCount(otherEventId);
		const result = await postAction(page, `/events/${otherEventId}/admin?/addSchedule`, {
			name: 'Injected Schedule',
			startDate: '2030-01-01T10:00',
			endDate: '2030-01-01T12:00'
		});
		expect(result.type).toBe('failure');
		expect(result.status).toBe(403);
		expect(await getScheduleCount(otherEventId)).toBe(before);
	});

	test('unauthenticated user gets 401 and schedule is not inserted', async ({ page, context }) => {
		await context.clearCookies();

		const before = await getScheduleCount(otherEventId);
		const result = await postAction(page, `/events/${otherEventId}/admin?/addSchedule`, {
			name: 'Injected Schedule',
			startDate: '2030-01-01T10:00',
			endDate: '2030-01-01T12:00'
		});
		expect(result.type).toBe('failure');
		expect(result.status).toBe(401);
		expect(await getScheduleCount(otherEventId)).toBe(before);
	});

	// ─── Role change takes immediate effect ────────────────────────────────────
	// hooks.server.ts queries the DB fresh on every request, so revoking admin
	// must lock the user out immediately — no re-login required.

	test('revoking admin role takes effect on the very next request', async ({ page, context }) => {
		await setUserRole(userId, 'admin');
		await signIn(page, context);

		// Verify admin access works now
		await page.goto(`/events/${otherEventId}/admin`);
		await expect(page).toHaveURL(/\/admin$/);

		// Revoke admin in DB without re-logging in
		await setUserRole(userId, 'user');

		// The very next request must be denied
		await page.goto(`/events/${otherEventId}/admin`);
		await expect(page).not.toHaveURL(/\/admin$/);
	});

	// ─── Edit page guard ───────────────────────────────────────────────────────

	test('regular user cannot visit the edit page of another users event', async ({
		page,
		context
	}) => {
		await setUserRole(userId, 'user');
		await signIn(page, context);
		await page.goto(`/events/${otherEventId}/edit`);
		// Edit page has no server-side load redirect — check that the save action rejects
		const result = await postAction(page, `/events/${otherEventId}/edit?/updateEvent`, {
			name: 'Injected Name',
			description: '',
			startDate: '2030-01-01',
			endDate: '2030-01-02',
			location: 'Injected'
		});
		// updateEvent is a remote function, not a traditional action — 403 or error expected
		expect(result.status).not.toBe(200);
	});

	// ─── Edge cases ────────────────────────────────────────────────────────────

	test('admin accessing a non-existent event gets a not-found error', async ({
		page,
		context
	}) => {
		await setUserRole(userId, 'admin');
		await signIn(page, context);
		await page.goto('/events/totally-fake-event-id-xyz/admin');
		await expect(page.getByText(/not found|404/i)).toBeVisible();
	});

	test('owner who is also admin can manage their own event', async ({ page, context }) => {
		await setUserRole(userId, 'admin');
		await signIn(page, context);
		await page.goto(`/events/${ownEventId}/admin`);
		await expect(page).toHaveURL(/\/admin$/);
	});
});
