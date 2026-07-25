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
			await page.goto('/events/create');

			// Fill required text fields
			await page.getByLabel('Event name').fill('Organizing Test Event');

			// Set hidden inputs that EventLocationInput and RangeCalendar populate
			await page.evaluate(() => {
				const tomorrow = new Date();
				tomorrow.setDate(tomorrow.getDate() + 30);
				const end = new Date(tomorrow);
				end.setDate(end.getDate() + 3);

				const set = (name: string, value: string) => {
					const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
					if (el) el.value = value;
				};

				set('location', 'Munich, Germany');
				set('city', 'Munich');
				set('country', 'Germany');
				set('latitude', '48.1371');
				set('longitude', '11.5754');
				set('startDate', tomorrow.toISOString().split('T')[0]);
				set('endDate', end.toISOString().split('T')[0]);
			});

			await page.getByRole('button', { name: 'Create Event' }).click();
			await page.waitForLoadState('networkidle');

			// Creating an event now lands the organizer in the manage area
			const url = page.url();
			expect(url).toMatch(/\/events\/[a-z0-9]+\/admin$/);
			createdEventId = url.split('/events/')[1].replace('/admin', '');

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
