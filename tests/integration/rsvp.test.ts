import { test, expect } from '@playwright/test';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	setAttending,
	clearAttending,
	isAttending,
	setOrganizing,
	clearEventUser,
	getEventUserRows,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';

installErrorGuard(test);

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

/**
 * One relationship per user and event. An organizer used to be able to RSVP as
 * well — the button is hidden for them, but the server did not refuse it —
 * which left two rows and inflated counts.
 */
test.describe('organizers and RSVPs', () => {
	let eventId: string;
	let userId: string;

	test.beforeEach(async () => {
		userId = await getTestUserId(TEST_USER.email);
		const ownerId = userId;
		eventId = await createTestEvent(ownerId, { name: 'RSVP Organizer Spec Event' });
	});

	test.afterEach(async () => {
		await clearEventUser(eventId, userId);
		await deleteTestEvent(eventId);
	});

	test.afterAll(async () => {
		await closeDb();
	});

	test('a stale RSVP button cannot give an organizer a second row', async ({ page }) => {
		expectConsoleErrors(page);
		await page.goto(`/events/${eventId}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('rsvp-button')).toBeVisible();

		// Becomes a co-organizer while the RSVP button is still on screen.
		await setOrganizing(eventId, userId);
		await page.getByTestId('rsvp-button').click();
		await page.waitForLoadState('networkidle');

		expect(await getEventUserRows(eventId, userId)).toEqual(['organizing']);
	});
});
