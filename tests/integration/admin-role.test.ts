import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { TEST_USER } from './helpers/constants';
import {
	getTestUserId,
	createTestUser,
	deleteTestUser,
	createTestEvent,
	deleteTestEvent,
	setUserRole,
	closeDb
} from './helpers/db';

// Re-authenticate after clearing cookies (role changes require fresh session checks)
async function reAuth(page: Page, context: BrowserContext) {
	await context.clearCookies();
	const resp = await page.request.post('/api/auth/sign-in/email', {
		data: { email: TEST_USER.email, password: 'playwright-test-pw-123' }
	});
	expect(resp.ok()).toBeTruthy();
	const state = await page.request.storageState();
	await context.addCookies(state.cookies);
}

test.describe('admin role', () => {
	let userId: string;
	let otherUserId: string;
	let ownEventId: string;
	let otherEventId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
		otherUserId = await createTestUser('other@playwright.local', 'Other Test User');
		ownEventId = await createTestEvent(userId, { name: 'Admin Test - Own Event' });
		otherEventId = await createTestEvent(otherUserId, { name: 'Admin Test - Other Event' });
	});

	test.afterAll(async () => {
		await setUserRole(userId, 'user');
		await deleteTestEvent(ownEventId);
		await deleteTestEvent(otherEventId);
		await deleteTestUser(otherUserId);
		await closeDb();
	});

	test('regular user cannot access admin page of another users event', async ({ page, context }) => {
		await setUserRole(userId, 'user');
		await reAuth(page, context);
		await page.goto(`/events/${otherEventId}/admin`);
		await expect(page).not.toHaveURL(/\/admin$/);
	});

	test('regular user does not see Edit/Manage buttons on events they do not own', async ({
		page,
		context
	}) => {
		await setUserRole(userId, 'user');
		await reAuth(page, context);
		await page.goto(`/events/${otherEventId}`);
		await expect(page.getByRole('link', { name: 'Edit' })).not.toBeVisible();
		await expect(page.getByRole('link', { name: 'Manage' })).not.toBeVisible();
	});

	test('admin can access admin page of any event', async ({ page, context }) => {
		await setUserRole(userId, 'admin');
		await reAuth(page, context);
		await page.goto(`/events/${otherEventId}/admin`);
		await expect(page).toHaveURL(/\/admin$/);
		await expect(page.getByRole('heading', { name: 'Admin Test - Other Event' })).toBeVisible();
	});

	test('admin sees Edit and Manage buttons on any event detail page', async ({ page, context }) => {
		await setUserRole(userId, 'admin');
		await reAuth(page, context);
		await page.goto(`/events/${otherEventId}`);
		await expect(page.getByRole('link', { name: 'Edit' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Manage' })).toBeVisible();
	});
});
