import { test, expect } from '@playwright/test';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	createMagicLink,
	getEventUserStatus,
	clearEventUser,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { installErrorGuard } from './helpers/console';
import { openCreateEventPage, pickEventDateRange } from './helpers/forms';

installErrorGuard(test);

test.describe('organizing status', () => {
	let userId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
	});

	test.afterAll(async () => {
		await closeDb();
	});

	test.describe('event creation auto-organizes creator', () => {
		let createdEventId: string;

		test.afterAll(async () => {
			if (createdEventId) await deleteTestEvent(createdEventId);
		});

		test('creator sees Organizing badge and no RSVP button after creating event', async ({
			page
		}) => {
			await openCreateEventPage(page);
			await page.getByLabel('Event name').fill('Organizing Test Event');
			// Location is left empty: it is optional, and filling it would mean
			// driving the geocoding combobox against photon.komoot.io.
			await pickEventDateRange(page);

			await page.getByRole('button', { name: 'Create event' }).click();

			// Creating an event lands the organizer in the manage area.
			//
			// Asserted with `expect(page).toHaveURL`, which retries, rather than a
			// one-shot `expect(page.url())`. `waitForLoadState('networkidle')` is no
			// help here: the page already reached networkidle before the submit, so it
			// returns immediately and the redirect has not happened yet.
			await expect(page).toHaveURL(/\/events\/[a-z0-9]+\/admin$/);
			createdEventId = page.url().split('/events/')[1].replace('/admin', '');

			await expect(page.getByTestId('setup-checklist')).toBeVisible();

			// The public page is where the RSVP controls live
			await page.goto(`/events/${createdEventId}`);
			await page.waitForLoadState('networkidle');

			// No RSVP button for the creator
			await expect(page.getByTestId('rsvp-button')).not.toBeVisible();

			// Organizing badge should be shown
			await expect(page.getByTestId('organizing-badge')).toBeVisible();
			await expect(page.getByTestId('organizing-badge')).toContainText('Organizing');

			// DB should have organizing status
			const status = await getEventUserStatus(createdEventId, userId);
			expect(status).toBe('organizing');
		});
	});

	test.describe('magic link acceptance sets organizing status', () => {
		let eventId: string;
		let token: string;

		test.beforeAll(async () => {
			eventId = await createTestEvent(userId, { name: 'Magic Link Organizing Event' });
			token = await createMagicLink(eventId);
		});

		test.afterEach(async () => {
			await clearEventUser(eventId, userId);
		});

		test.afterAll(async () => {
			await deleteTestEvent(eventId);
		});

		test('accepting a magic link sets user as organizer', async ({ page }) => {
			await page.goto(`/invite/${token}`);
			await page.waitForLoadState('networkidle');

			// Should redirect to the event detail page
			await expect(page).toHaveURL(`/events/${eventId}`);

			// No RSVP button for organizer
			await expect(page.getByTestId('rsvp-button')).not.toBeVisible();

			// Organizing badge should be shown
			await expect(page.getByTestId('organizing-badge')).toBeVisible();
			await expect(page.getByTestId('organizing-badge')).toContainText('Organizing');

			// DB should have organizing status
			const status = await getEventUserStatus(eventId, userId);
			expect(status).toBe('organizing');
		});

		test('existing attending user upgrading via magic link sees Organizing badge', async ({
			page
		}) => {
			// Seed attending status first, then accept the magic link to upgrade
			await page.goto(`/events/${eventId}`);
			await page.getByTestId('rsvp-button').click();
			await page.waitForLoadState('networkidle');

			// Now accept the magic link — should upgrade to organizing
			await page.goto(`/invite/${token}`);
			await page.waitForLoadState('networkidle');

			await expect(page).toHaveURL(`/events/${eventId}`);
			await expect(page.getByTestId('organizing-badge')).toBeVisible();

			const status = await getEventUserStatus(eventId, userId);
			expect(status).toBe('organizing');
		});
	});
});
