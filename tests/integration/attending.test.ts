import { test, expect } from '@playwright/test';
import { TEST_USER } from './helpers/constants';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	clearAttending,
	closeDb
} from './helpers/db';

test.describe('/attending page', () => {
	let eventId: string;
	let userId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
		eventId = await createTestEvent(userId, { name: 'Attending Page Test Event' });
	});

	test.afterEach(async () => {
		await clearAttending(eventId, userId);
	});

	test.afterAll(async () => {
		await deleteTestEvent(eventId);
		await closeDb();
	});

	test('shows empty state when not attending any upcoming events', async ({ page }) => {
		await page.goto('/attending');
		await expect(page.getByText(/No upcoming events/)).toBeVisible();
	});

	test('shows event in upcoming after RSVP', async ({ page }) => {
		await page.goto(`/events/${eventId}`);
		await page.getByTestId('rsvp-button').click();
		await page.waitForLoadState('networkidle');

		await page.goto('/attending');
		await expect(page.getByText('Attending Page Test Event')).toBeVisible();
	});

	test('shows countdown badge for upcoming event', async ({ page }) => {
		await page.goto(`/events/${eventId}`);
		await page.getByTestId('rsvp-button').click();
		await page.waitForLoadState('networkidle');

		await page.goto('/attending');
		await expect(page.getByText(/days away|Tomorrow|Today/)).toBeVisible();
	});

	test('redirects unauthenticated user to sign-in', async ({ page, context }) => {
		await context.clearCookies();
		await page.goto('/attending');
		await expect(page).toHaveURL(/sign-in/);
	});
});
