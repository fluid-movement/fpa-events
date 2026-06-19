import { test, expect } from '@playwright/test';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	setAttending,
	clearAttending,
	isAttending,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';

test.describe('RSVP toggle', () => {
	let eventId: string;
	let userId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
		eventId = await createTestEvent(userId, { name: 'RSVP Test Event' });
	});

	test.afterEach(async () => {
		await clearAttending(eventId, userId);
	});

	test.afterAll(async () => {
		await deleteTestEvent(eventId);
		await closeDb();
	});

	test('shows Attend button when not attending', async ({ page }) => {
		await page.goto(`/events/${eventId}`);
		await expect(page.getByTestId('rsvp-button')).toBeVisible();
		await expect(page.getByTestId('rsvp-button')).toContainText('Attend');
	});

	test('clicking Attend marks user as attending', async ({ page }) => {
		await page.goto(`/events/${eventId}`);
		await page.getByTestId('rsvp-button').click();
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('rsvp-button')).toContainText('Attending');
		expect(await isAttending(eventId, userId)).toBe(true);
	});

	test('clicking Attending toggles back to not attending', async ({ page }) => {
		await setAttending(eventId, userId);

		await page.goto(`/events/${eventId}`);
		await expect(page.getByTestId('rsvp-button')).toContainText('Attending');

		await page.getByTestId('rsvp-button').click();
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('rsvp-button')).toContainText('Attend');
		expect(await isAttending(eventId, userId)).toBe(false);
	});

	test('attendee count increments on attend', async ({ page }) => {
		await page.goto(`/events/${eventId}`);
		const btn = page.getByTestId('rsvp-button');
		const before = parseInt((await btn.textContent())?.match(/\d+/)?.[0] ?? '0');

		await btn.click();
		await page.waitForLoadState('networkidle');

		const after = parseInt((await btn.textContent())?.match(/\d+/)?.[0] ?? '0');
		expect(after).toBe(before + 1);
	});

	test('unauthenticated user sees a sign-in link instead of button', async ({ page, context }) => {
		await context.clearCookies();
		await page.goto(`/events/${eventId}`);

		const signInLink = page.getByTestId('rsvp-sign-in-link');
		await expect(signInLink).toBeVisible();
		await expect(signInLink).toHaveAttribute('href', '/sign-in');
	});
});
