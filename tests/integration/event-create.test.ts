import { test, expect } from '@playwright/test';
import {
	getEventIdByName,
	deleteEventsByName,
	getEventUserStatus,
	getTestUserId,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { installErrorGuard } from './helpers/console';
import { openCreateEventPage, pickEventDateRange } from './helpers/forms';

installErrorGuard(test);

const EVENT_NAME = 'Playwright Created Event';

/**
 * `createEvent` (src/routes/events/create/data.remote.ts) is the app's primary
 * write path and had no end-to-end coverage. It does two inserts that must both
 * land — the event row and the organizing seat — and a failure in the second
 * leaves an event nobody can manage.
 *
 * The location field is left empty on purpose. It is a hidden input that only
 * `EventLocationInput` populates on geocode selection, and driving that would
 * make every run depend on photon.komoot.io. The schema accepts an empty string,
 * so the flow is honest without the external call.
 */

test.describe('creating an event', () => {
	let userId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
	});

	test.beforeEach(async () => {
		await deleteEventsByName(EVENT_NAME);
	});

	test.afterAll(async () => {
		await deleteEventsByName(EVENT_NAME);
		await closeDb();
	});

	test('creates the event and lands the organizer in the manage area', async ({ page }) => {
		await openCreateEventPage(page);
		await page.getByLabel('Event name').fill(EVENT_NAME);
		await pickEventDateRange(page);
		await page.getByRole('button', { name: 'Create event' }).click();
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveURL(/\/events\/[^/]+\/admin$/);

		const eventId = await getEventIdByName(EVENT_NAME);
		expect(eventId).toBeTruthy();
		expect(page.url()).toContain(eventId!);

		// The organizing seat is what grants access to the page we just landed on.
		expect(await getEventUserStatus(eventId!, userId)).toBe('organizing');
	});

	test('rejects an event with no name', async ({ page }) => {
		await openCreateEventPage(page);
		await pickEventDateRange(page);
		await page.getByRole('button', { name: 'Create event' }).click();
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveURL(/\/events\/create/);
		expect(await getEventIdByName(EVENT_NAME)).toBeNull();
	});

	test('redirects an anonymous visitor to sign-in', async ({ page, context }) => {
		await context.clearCookies();
		await page.goto('/events/create');
		await expect(page).toHaveURL(/\/sign-in/);
	});
});
