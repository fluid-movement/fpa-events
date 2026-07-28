import { test, expect, type Page } from '@playwright/test';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	setOrganizing,
	getScheduleCount,
	getLocationCoords,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { installErrorGuard } from './helpers/console';

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
