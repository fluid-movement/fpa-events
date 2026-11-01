import { test, expect } from '@playwright/test';
import {
	getEventIdByName,
	deleteEventsByName,
	sql,
	closeDb,
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	setOrganizing
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { installErrorGuard } from './helpers/console';
import { openCreateEventPage, pickEventDateRange } from './helpers/forms';

installErrorGuard(test);

const EVENT_NAME = 'Playwright Editor Event';

async function storedDescription(name: string): Promise<string | undefined> {
	const [row] = await sql()`select description from events where name = ${name}`;
	return row?.description;
}

/**
 * The rich-text editor feeds a hidden form field. Its value once stopped updating
 * after the first keystroke (a `$derived` over an object that never changed identity),
 * so a save kept one letter. Nothing else types into the editor, so nothing else
 * would notice.
 */
test.describe('rich-text description', () => {
	test.beforeEach(async () => {
		await deleteEventsByName(EVENT_NAME);
	});

	test.afterAll(async () => {
		await deleteEventsByName(EVENT_NAME);
		await closeDb();
	});

	test('everything typed into the editor is saved, on create and on edit', async ({ page }) => {
		await openCreateEventPage(page);
		await page.getByLabel('Event name').fill(EVENT_NAME);
		await pickEventDateRange(page);
		await page.locator('.ProseMirror').click();
		await page.keyboard.type('hello world');
		await page.getByRole('button', { name: 'Create event' }).click();
		await expect(page).toHaveURL(/\/events\/[^/]+\/admin$/);
		await expect.poll(() => storedDescription(EVENT_NAME)).toBe('<p>hello world</p>');

		const eventId = await getEventIdByName(EVENT_NAME);
		await page.goto(`/events/${eventId}/admin/edit`);
		await page.waitForLoadState('networkidle');
		await page.locator('.ProseMirror').click();
		await page.keyboard.press('End');
		await page.keyboard.type(' and more');
		await page.getByTestId('save-details').click();
		await expect(page.getByTestId('event-details-view')).toBeVisible();
		await expect.poll(() => storedDescription(EVENT_NAME)).toBe('<p>hello world and more</p>');
	});
});

test.describe('rich-text schedule description', () => {
	test.afterAll(async () => {
		await closeDb();
	});

	test('everything typed into a schedule item is saved, on add and on edit', async ({ page }) => {
		const userId = await getTestUserId(TEST_USER.email);
		const eventId = await createTestEvent(userId, { name: 'Editor Schedule Spec Event' });
		await setOrganizing(eventId, userId);
		const stored = async () => {
			const [row] = await sql()`select description from schedules where event_id = ${eventId}`;
			return row?.description;
		};
		try {
			await page.goto(`/events/${eventId}/admin/schedule`);
			await page.waitForLoadState('networkidle');
			await page.getByRole('button', { name: 'Add Schedule Item' }).click();
			await page.locator('#schedule-name').fill('Editor Item');
			await page.locator('button[aria-pressed]').first().click();
			await page.locator('#schedule-start-time').fill('09:00');
			await page.locator('#schedule-end-time').fill('10:00');
			await page.locator('.ProseMirror').click();
			await page.keyboard.type('doors at nine');
			await page.getByRole('button', { name: 'Add item' }).click();
			await expect.poll(stored).toBe('<p>doors at nine</p>');

			await page.getByRole('button', { name: 'Edit Editor Item' }).click();
			await page.locator('.ProseMirror').click();
			await page.keyboard.press('End');
			await page.keyboard.type(' sharp');
			await page.getByRole('button', { name: 'Save' }).click();
			await expect.poll(stored).toBe('<p>doors at nine sharp</p>');
		} finally {
			await deleteTestEvent(eventId);
		}
	});
});
