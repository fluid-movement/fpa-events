import { test, expect, type Page } from '@playwright/test';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	setOrganizing,
	getScheduleCount,
	getScheduleDescriptions,
	insertScheduleItem,
	getScheduleItem,
	insertVenue,
	venueExists,
	createTestUser,
	deleteTestUser,
	getLocationCoords,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';
import { postOverriding } from './helpers/forms';

installErrorGuard(test);

/**
 * Covers schedule.remote.ts and locations.remote.ts — the add/edit/delete write
 * paths in the manage area. `event-manage.test.ts` already covers creating a
 * location and selecting it on an item, so this spec deliberately does not
 * repeat that and picks up what it left: the schedule item lifecycle, the
 * end-before-start rule, and deleting a location.
 */

const ITEM_NAME = 'Opening Ceremony';
const RENAMED = 'Opening Ceremony (moved)';

/**
 * The schedule page resolves `listEventLocations` and `getEvent` client-side, so
 * the controls below do not exist at first paint. Every interaction here has to
 * wait for that to settle first.
 */
async function openSchedulePage(page: Page, eventId: string) {
	await page.goto(`/events/${eventId}/admin/schedule`);
	await page.waitForLoadState('networkidle');
}

/** Fills the open add/edit form. Day buttons are a toggle group, not a date input. */
async function fillItemForm(page: Page, name: string, start: string, end: string) {
	await page.locator('#schedule-name').fill(name);
	// First day of the event — the form starts with no day selected in 'new' mode.
	await page.locator('button[aria-pressed]').first().click();
	await page.locator('#schedule-start-time').fill(start);
	await page.locator('#schedule-end-time').fill(end);
}

test.describe('schedule items', () => {
	let eventId: string;
	let userId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
	});

	test.beforeEach(async () => {
		eventId = await createTestEvent(userId, { name: 'Schedule Spec Event' });
		await setOrganizing(eventId, userId);
	});

	test.afterEach(async () => {
		await deleteTestEvent(eventId);
	});

	test.afterAll(async () => {
		await closeDb();
	});

	test('adds an item', async ({ page }) => {
		await openSchedulePage(page, eventId);
		await page.getByRole('button', { name: 'Add Schedule Item' }).click();
		await fillItemForm(page, ITEM_NAME, '09:00', '11:00');
		await page.getByRole('button', { name: 'Add item' }).click();
		await page.waitForLoadState('networkidle');

		await expect(page.getByText(ITEM_NAME)).toBeVisible();
		// Polled, not read once: the remote call returns before the row is visible
		// to this test's separate database connection.
		await expect.poll(() => getScheduleCount(eventId)).toBe(1);
	});

	test('rejects an end time at or before the start', async ({ page }) => {
		await openSchedulePage(page, eventId);
		await page.getByRole('button', { name: 'Add Schedule Item' }).click();
		await fillItemForm(page, ITEM_NAME, '11:00', '09:00');
		await page.getByRole('button', { name: 'Add item' }).click();
		await page.waitForLoadState('networkidle');

		// The remote function throws before inserting — nothing should land.
		expect(await getScheduleCount(eventId)).toBe(0);
	});

	test('edits an item', async ({ page }) => {
		await openSchedulePage(page, eventId);
		await page.getByRole('button', { name: 'Add Schedule Item' }).click();
		await fillItemForm(page, ITEM_NAME, '09:00', '11:00');
		await page.getByRole('button', { name: 'Add item' }).click();
		await page.waitForLoadState('networkidle');

		await page.getByRole('button', { name: `Edit ${ITEM_NAME}` }).click();
		await page.locator('#schedule-name').fill(RENAMED);
		await page.getByRole('button', { name: 'Save' }).click();
		await page.waitForLoadState('networkidle');

		await expect(page.getByText(RENAMED)).toBeVisible();
		await expect.poll(() => getScheduleCount(eventId)).toBe(1);
	});

	test('deletes an item behind a confirmation', async ({ page }) => {
		await openSchedulePage(page, eventId);
		await page.getByRole('button', { name: 'Add Schedule Item' }).click();
		await fillItemForm(page, ITEM_NAME, '09:00', '11:00');
		await page.getByRole('button', { name: 'Add item' }).click();
		await expect(page.getByText(ITEM_NAME)).toBeVisible();
		await expect.poll(() => getScheduleCount(eventId)).toBe(1);

		await page.getByRole('button', { name: `Delete ${ITEM_NAME}` }).click();
		await page.getByTestId('confirm-delete-schedule-item').click();
		await page.waitForLoadState('networkidle');

		await expect.poll(() => getScheduleCount(eventId)).toBe(0);
	});
});

test.describe('event locations', () => {
	let eventId: string;
	let userId: string;
	const LOCATION = 'Main Field';

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
	});

	test.beforeEach(async () => {
		eventId = await createTestEvent(userId, { name: 'Location Spec Event' });
		await setOrganizing(eventId, userId);
	});

	test.afterEach(async () => {
		await deleteTestEvent(eventId);
	});

	test.afterAll(async () => {
		await closeDb();
	});

	test('deletes a location behind a confirmation', async ({ page }) => {
		await openSchedulePage(page, eventId);
		await page.getByRole('button', { name: 'Add Location' }).click();
		await page.getByTestId('location-name-input').fill(LOCATION);
		await page.getByTestId('save-location').click();
		await expect(page.getByText(LOCATION)).toBeVisible();
		await expect.poll(() => getLocationCoords(eventId, LOCATION)).not.toBeNull();

		await page.getByRole('button', { name: `Delete ${LOCATION}` }).click();
		await page.getByTestId('confirm-delete-location').click();
		await page.waitForLoadState('networkidle');

		await expect.poll(() => getLocationCoords(eventId, LOCATION)).toBeNull();
	});
});

/**
 * Schedule descriptions are rendered with {@html}. Any signed-in user can create
 * an event, so an unsanitized description was a stored XSS on the public page.
 */
test.describe('schedule descriptions are sanitized', () => {
	const PAYLOAD = '<p>Bring water</p><img src="x" onerror="window.__xss = true">';
	let eventId: string;

	test.beforeEach(async () => {
		const userId = await getTestUserId(TEST_USER.email);
		eventId = await createTestEvent(userId, { name: 'Sanitize Spec Event' });
		await setOrganizing(eventId, userId);
	});

	test.afterEach(async () => {
		await deleteTestEvent(eventId);
	});

	test.afterAll(async () => {
		await closeDb();
	});

	test('an already-stored malicious description renders inert', async ({ page }) => {
		await insertScheduleItem(eventId, ITEM_NAME, PAYLOAD);

		await page.goto(`/events/${eventId}`);
		await page.waitForLoadState('networkidle');
		await page.getByRole('tab', { name: 'Schedule' }).click();

		await expect(page.getByText('Bring water')).toBeVisible();
		await expect(page.locator('img[onerror]')).toHaveCount(0);
		expect(await page.evaluate(() => (window as { __xss?: boolean }).__xss)).toBeUndefined();
	});

	test('a description posted around the editor is stored without markup it does not allow', async ({
		page
	}) => {
		const itemId = await insertScheduleItem(eventId, ITEM_NAME, '');
		await openSchedulePage(page, eventId);
		await page.getByRole('button', { name: `Edit ${ITEM_NAME}` }).click();
		await postOverriding(page, 'updateSchedule', itemId, { description: PAYLOAD });

		await expect.poll(() => getScheduleDescriptions(eventId)).toEqual(['<p>Bring water</p>']);
	});
});

/**
 * Item and venue ids travel in hidden form fields, so a manager of one event can
 * post any id they like. These tests send that hand-crafted request — the real
 * form's fields with one value swapped — and check the other event is untouched.
 */
test.describe('schedule writes stay inside the authorised event', () => {
	let ownEventId: string;
	let ownItemId: string;
	let otherUserId: string;
	let otherEventId: string;
	let otherItemId: string;
	let otherVenueId: number;

	test.beforeEach(async () => {
		const userId = await getTestUserId(TEST_USER.email);
		ownEventId = await createTestEvent(userId, { name: 'Scoping Spec Own Event' });
		await setOrganizing(ownEventId, userId);
		ownItemId = await insertScheduleItem(ownEventId, ITEM_NAME, '');

		otherUserId = await createTestUser(`scoping-${Date.now()}@playwright.local`, 'Other Organizer');
		otherEventId = await createTestEvent(otherUserId, { name: 'Scoping Spec Other Event' });
		otherItemId = await insertScheduleItem(otherEventId, 'Not Yours', '');
		otherVenueId = await insertVenue(otherEventId, 'Their Venue');
	});

	test.afterEach(async () => {
		await deleteTestEvent(ownEventId);
		await deleteTestEvent(otherEventId);
		await deleteTestUser(otherUserId);
	});

	test.afterAll(async () => {
		await closeDb();
	});

	test("editing cannot rename another event's item", async ({ page }) => {
		expectConsoleErrors(page);
		await openSchedulePage(page, ownEventId);
		await page.getByRole('button', { name: `Edit ${ITEM_NAME}` }).click();
		await page.locator('#schedule-name').fill('Hijacked');
		await postOverriding(page, 'updateSchedule', ownItemId, { id: otherItemId });

		expect((await getScheduleItem(otherItemId))?.name).toBe('Not Yours');
	});

	test("deleting cannot remove another event's item", async ({ page }) => {
		expectConsoleErrors(page);
		await openSchedulePage(page, ownEventId);
		await page.getByRole('button', { name: `Delete ${ITEM_NAME}` }).click();
		await postOverriding(page, 'deleteSchedule', ownItemId, { id: otherItemId });

		expect(await getScheduleItem(otherItemId)).not.toBeNull();
	});

	test("an item cannot be pointed at another event's venue", async ({ page }) => {
		expectConsoleErrors(page);
		await openSchedulePage(page, ownEventId);
		await page.getByRole('button', { name: `Edit ${ITEM_NAME}` }).click();
		await postOverriding(page, 'updateSchedule', ownItemId, { locationId: String(otherVenueId) });

		expect((await getScheduleItem(ownItemId))?.locationId).toBeNull();
	});

	test("deleting cannot remove another event's venue", async ({ page }) => {
		expectConsoleErrors(page);
		const ownVenueId = await insertVenue(ownEventId, 'Own Venue');
		await openSchedulePage(page, ownEventId);
		await page.getByRole('button', { name: 'Delete Own Venue' }).click();
		await postOverriding(page, 'deleteEventLocation', String(ownVenueId), {
			id: String(otherVenueId)
		});

		expect(await venueExists(otherVenueId)).toBe(true);
	});
});
