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
	getEventName,
	setOrganizing,
	setUserRole,
	closeDb
} from './helpers/db';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';

import { captureRemoteForm, callRemoteForm } from './helpers/forms';

installErrorGuard(test);

async function signIn(page: Page, context: BrowserContext) {
	await context.clearCookies();
	const resp = await page.request.post('/api/auth/sign-in/email', {
		data: { email: TEST_USER.email, password: 'playwright-test-pw-123' }
	});
	expect(resp.ok()).toBeTruthy();
	const state = await page.request.storageState();
	await context.addCookies(state.cookies);
}

test.describe('admin role — authorization', () => {
	let userId: string;
	let otherUserId: string;
	let ownEventId: string;
	let otherEventId: string;

	test.beforeEach(async () => {
		userId = await getTestUserId(TEST_USER.email);
		otherUserId = await createTestUser(
			`other-${crypto.randomUUID()}@playwright.local`,
			'Other Test User'
		);
		ownEventId = await createTestEvent(userId, { name: 'Auth Test - Own Event' });
		otherEventId = await createTestEvent(otherUserId, { name: 'Auth Test - Other Event' });
	});

	test.afterEach(async () => {
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
		await page.waitForLoadState('networkidle');
		await expect(page).not.toHaveURL(/\/admin$/);
	});

	test('unauthenticated user is redirected to sign-in from admin page', async ({
		page,
		context
	}) => {
		await context.clearCookies();
		await page.goto(`/events/${otherEventId}/admin`);
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/sign-in/);
	});

	test('regular user cannot see the Manage event button on events they do not own', async ({
		page,
		context
	}) => {
		await setUserRole(userId, 'user');
		await signIn(page, context);
		await page.goto(`/events/${otherEventId}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('manage-event-link')).not.toBeVisible();
	});

	test('admin can access admin page of any event', async ({ page, context }) => {
		await setUserRole(userId, 'admin');
		await signIn(page, context);
		await page.goto(`/events/${otherEventId}/admin`);
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin$/);
	});

	test('admin sees the Manage event button on any event', async ({ page, context }) => {
		await setUserRole(userId, 'admin');
		await signIn(page, context);
		await page.goto(`/events/${otherEventId}`);
		await page.waitForLoadState('networkidle');
		// Edit and Manage were merged into a single entry point.
		await expect(page.getByTestId('manage-event-link')).toBeVisible();
		await expect(page.getByTestId('manage-event-link')).toHaveAttribute(
			'href',
			`/events/${otherEventId}/admin`
		);
	});

	// Capture valid, owner-rendered forms before changing identity or target.
	async function captureDelete(page: Page) {
		await page.goto(`/events/${ownEventId}/admin`);
		await page.waitForLoadState('networkidle');
		return captureRemoteForm(page, 'deleteEvent');
	}

	async function captureSchedule(page: Page) {
		await page.goto(`/events/${ownEventId}/admin/schedule`);
		await page.waitForLoadState('networkidle');
		await page.getByRole('button', { name: 'Add Schedule Item' }).click();
		await page.locator('#schedule-name').fill('Injected Schedule');
		await page.locator('button[aria-pressed]').first().click();
		await page.locator('#schedule-start-time').fill('10:00');
		await page.locator('#schedule-end-time').fill('12:00');
		return captureRemoteForm(page, 'addSchedule');
	}

	test('non-admin non-owner gets error and event is not deleted', async ({ page }) => {
		expectConsoleErrors(page);
		const form = await captureDelete(page);
		const result = await callRemoteForm(page, form, { eventId: otherEventId });
		expect(result).toMatchObject({ type: 'error', error: { status: 403 } });
		await expect.poll(() => eventExists(otherEventId)).toBe(true);
	});

	test('unauthenticated user gets error and event is not deleted', async ({ page, context }) => {
		expectConsoleErrors(page);
		const form = await captureDelete(page);
		await context.clearCookies();
		const result = await callRemoteForm(page, form);
		expect(result).toMatchObject({ type: 'error', error: { status: 401 } });
		await expect.poll(() => eventExists(ownEventId)).toBe(true);
	});

	test('non-admin non-owner gets error and schedule is not inserted', async ({ page }) => {
		expectConsoleErrors(page);
		const form = await captureSchedule(page);
		const result = await callRemoteForm(page, form, { eventId: otherEventId });
		expect(result).toMatchObject({ type: 'error', error: { status: 403 } });
		await expect.poll(() => getScheduleCount(otherEventId)).toBe(0);
	});

	test('unauthenticated user gets error and schedule is not inserted', async ({
		page,
		context
	}) => {
		expectConsoleErrors(page);
		const form = await captureSchedule(page);
		await context.clearCookies();
		const result = await callRemoteForm(page, form);
		expect(result).toMatchObject({ type: 'error', error: { status: 401 } });
		await expect.poll(() => getScheduleCount(ownEventId)).toBe(0);
	});

	test('a co-organizer cannot delete the event with a direct remote POST', async ({ page }) => {
		expectConsoleErrors(page);
		const form = await captureDelete(page);
		await setOrganizing(otherEventId, userId);
		const result = await callRemoteForm(page, form, { eventId: otherEventId });
		expect(result).toMatchObject({ type: 'error', error: { status: 403 } });
		await expect.poll(() => eventExists(otherEventId)).toBe(true);
	});

	test('the captured schedule payload succeeds for its owner', async ({ page }) => {
		const form = await captureSchedule(page);
		const result = await callRemoteForm(page, form);
		expect(result.type).toBe('result');
		await expect.poll(() => getScheduleCount(ownEventId)).toBe(1);
	});

	test('the captured delete payload succeeds for its owner', async ({ page }) => {
		const form = await captureDelete(page);
		const result = await callRemoteForm(page, form);
		expect(result.type).toBe('result');
		await expect.poll(() => eventExists(ownEventId)).toBe(false);
	});

	// ─── Role change takes immediate effect ────────────────────────────────────
	// hooks.server.ts queries the DB fresh on every request, so revoking admin
	// must lock the user out immediately — no re-login required.

	test('revoking admin role takes effect on the very next request', async ({ page, context }) => {
		await setUserRole(userId, 'admin');
		await signIn(page, context);

		// Verify admin access works now
		await page.goto(`/events/${otherEventId}/admin`);
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin$/);

		// Revoke admin in DB without re-logging in
		await setUserRole(userId, 'user');

		// The very next request must be denied
		await page.goto(`/events/${otherEventId}/admin`);
		await page.waitForLoadState('networkidle');
		await expect(page).not.toHaveURL(/\/admin$/);
	});

	// ─── Details guard ─────────────────────────────────────────────────────────

	test('regular user cannot reach the details form of another users event', async ({
		page,
		context
	}) => {
		expectConsoleErrors(page);
		await setUserRole(userId, 'user');
		await signIn(page, context);

		// The manage area's load guard bounces a non-manager to the public event page.
		await page.goto(`/events/${otherEventId}/admin/edit`);
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(`/events/${otherEventId}`);

		// Capture the real edit form, then target the other event's route params.
		await page.goto(`/events/${ownEventId}/admin/edit`);
		await page.waitForLoadState('networkidle');
		const form = await captureRemoteForm(page, 'updateEvent');
		form.action = form.action.replace(ownEventId, otherEventId);
		const result = await callRemoteForm(page, form, { name: 'Injected Name' });
		expect(result).toMatchObject({ type: 'error', error: { status: 403 } });
		await expect.poll(() => getEventName(otherEventId)).toBe('Auth Test - Other Event');
	});

	// ─── Edge cases ────────────────────────────────────────────────────────────

	test('admin accessing a non-existent event gets a not-found error', async ({ page, context }) => {
		await setUserRole(userId, 'admin');
		await signIn(page, context);
		expectConsoleErrors(page);
		await page.goto('/events/totally-fake-event-id-xyz/admin');
		await page.waitForLoadState('networkidle');
		await expect(page.getByText(/not found|404/i)).toBeVisible();
	});

	test('owner who is also admin can manage their own event', async ({ page, context }) => {
		await setUserRole(userId, 'admin');
		await signIn(page, context);
		await page.goto(`/events/${ownEventId}/admin`);
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/admin$/);
	});
});
