import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { TEST_USER } from './helpers/constants';
import {
	getTestUserId,
	createTestUser,
	deleteTestUser,
	createTestEvent,
	deleteTestEvent,
	setAttending,
	setOrganizing,
	setShowAttendance,
	getShowAttendance,
	setUserRole,
	closeDb
} from './helpers/db';

async function signIn(page: Page, context: BrowserContext) {
	await context.clearCookies();
	const resp = await page.request.post('/api/auth/sign-in/email', {
		data: { email: TEST_USER.email, password: TEST_USER.password }
	});
	expect(resp.ok()).toBeTruthy();
	await context.addCookies((await page.request.storageState()).cookies);
}

test.describe('attendee name privacy', () => {
	let userId: string;
	let otherUserId: string;
	let eventId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
		await setUserRole(userId, 'user');
		otherUserId = await createTestUser('privacy-other@playwright.local', 'Wanda Privacy');
		eventId = await createTestEvent(userId, { name: 'Privacy Test Event' });
		// The test user organizes; the other user attends and will opt out.
		await setOrganizing(eventId, userId);
		await setAttending(eventId, otherUserId);
	});

	test.afterAll(async () => {
		await deleteTestEvent(eventId);
		await deleteTestUser(otherUserId);
		await closeDb();
	});

	test.beforeEach(async () => {
		await setShowAttendance(otherUserId, true);
		await setShowAttendance(userId, true);
	});

	test('an opted-in attendee is named on the public event page', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto(`/events/${eventId}`);
		await page.waitForLoadState('networkidle');

		await expect(page.getByText(/Wanda/)).toBeVisible();
	});

	test('an opted-out attendee is not named but still counted', async ({ page, context }) => {
		await setShowAttendance(otherUserId, false);
		await signIn(page, context);
		await page.goto(`/events/${eventId}`);
		await page.waitForLoadState('networkidle');

		// Name gone from the summary line...
		await expect(page.getByText(/Wanda/)).not.toBeVisible();
		// ...but the total still counts them.
		await expect(page.getByText(/1 person attending/)).toBeVisible();
	});

	test('an opted-out attendee is not listed in the attendees modal', async ({ page, context }) => {
		await setShowAttendance(otherUserId, false);
		await signIn(page, context);
		await page.goto(`/events/${eventId}`);
		await page.waitForLoadState('networkidle');

		await page.getByText(/1 person attending/).click();
		await expect(page.getByTestId('hidden-attendee-count')).toBeVisible();
		await expect(page.getByTestId('hidden-attendee-count')).toContainText('and 1 other');
		await expect(page.getByText('Wanda Privacy')).not.toBeVisible();
	});

	test('organizers still see opted-out attendees in the manage area', async ({ page, context }) => {
		await setShowAttendance(otherUserId, false);
		await signIn(page, context);
		await page.goto(`/events/${eventId}/admin/attendees`);
		await page.waitForLoadState('networkidle');

		// Opting out is a public-page setting only — organizers need the real list.
		await expect(page.getByText('Wanda Privacy')).toBeVisible();
		await expect(page.getByText('privacy-other@playwright.local')).toBeVisible();
	});

	test('the privacy switch persists and reflects the stored value', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto('/settings/privacy');
		await page.waitForLoadState('networkidle');

		const toggle = page.getByTestId('show-attendance-switch');
		await expect(toggle).toHaveAttribute('data-state', 'checked');

		// The save fetch starts a microtask after the click, so `networkidle` can
		// resolve before it even begins — poll the stored value instead.
		await toggle.click();
		await expect.poll(() => getShowAttendance(userId)).toBe(false);

		// Survives a reload
		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('show-attendance-switch')).toHaveAttribute(
			'data-state',
			'unchecked'
		);

		// And back on
		await page.getByTestId('show-attendance-switch').click();
		await expect.poll(() => getShowAttendance(userId)).toBe(true);
	});

	test('the Privacy tab is reachable from settings', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto('/settings/profile');
		// Scoped by testid: the sidebar footer also has a "Privacy" link (privacy-policy).
		await page.getByTestId('settings-tab-privacy').click();
		await expect(page).toHaveURL('/settings/privacy');
		await expect(page.getByTestId('show-attendance-switch')).toBeVisible();
	});
});
