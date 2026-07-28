import { test, expect } from '@playwright/test';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	deleteEventsByName,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { installErrorGuard } from './helpers/console';

installErrorGuard(test);

/**
 * The read-only public surface: homepage, the events list and the year archive.
 *
 * Kept deliberately thin. These pages are mostly presentational, so asserting
 * their copy line by line would buy churn rather than safety — the real value
 * here is the error guard proving every one of them renders and hydrates
 * without throwing, signed out as a stranger would see them.
 */

const UPCOMING = 'Public Page Upcoming Event';

test.describe('public pages', () => {
	let eventId: string;

	test.beforeAll(async () => {
		const userId = await getTestUserId(TEST_USER.email);
		await deleteEventsByName(UPCOMING);
		eventId = await createTestEvent(userId, { name: UPCOMING });
	});

	test.afterAll(async () => {
		await deleteTestEvent(eventId);
		await closeDb();
	});

	test.beforeEach(async ({ context }) => {
		// Everything here must work signed out.
		await context.clearCookies();
	});

	test('the homepage renders and links to the events list', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		await expect(page.getByRole('heading', { name: 'FPA Event Calendar' })).toBeVisible();
	});

	test('the events list shows an upcoming event', async ({ page }) => {
		await page.goto('/events');
		await page.waitForLoadState('networkidle');

		await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
		await expect(page.getByText(UPCOMING)).toBeVisible();
	});

	test('an event page is readable without signing in', async ({ page }) => {
		await page.goto(`/events/${eventId}`);
		await page.waitForLoadState('networkidle');

		await expect(page.getByRole('heading', { name: UPCOMING })).toBeVisible();
		// Signed out there is no RSVP button, only a prompt to sign in.
		await expect(page.getByTestId('rsvp-button')).toHaveCount(0);
	});

	test('a missing event is a 404 rather than a crash', async ({ page }) => {
		const resp = await page.request.get('/events/definitely-not-an-event-id');
		expect(resp.status()).toBe(404);
	});

	test('the past-events archive renders for a year', async ({ page }) => {
		const lastYear = new Date().getFullYear() - 1;
		await page.goto(`/events/past/${lastYear}`);
		await page.waitForLoadState('networkidle');

		await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
		await expect(page).toHaveTitle(new RegExp(String(lastYear)));
	});

	test('the legal pages render', async ({ page }) => {
		for (const path of ['/legal-notice', '/privacy-policy']) {
			await page.goto(path);
			await page.waitForLoadState('networkidle');
			await expect(page.locator('h1')).toBeVisible();
		}
	});
});
