import { test, expect } from '@playwright/test';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	setOrganizing,
	getEventDates,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';
import { postOverriding } from './helpers/forms';

installErrorGuard(test);

/**
 * The range picker never produces an end before the start, but the dates are
 * hidden fields, so the server is the only real guard.
 */
test.describe('event dates', () => {
	const NAME = 'Dates Spec Event';
	let eventId: string;

	test.beforeEach(async () => {
		const userId = await getTestUserId(TEST_USER.email);
		eventId = await createTestEvent(userId, { name: NAME });
		await setOrganizing(eventId, userId);
	});

	test.afterEach(async () => {
		await deleteTestEvent(eventId);
	});

	test.afterAll(async () => {
		await closeDb();
	});

	test('an edit that ends before it starts is refused', async ({ page }) => {
		expectConsoleErrors(page);
		const before = await getEventDates(eventId);

		await page.goto(`/events/${eventId}/admin/edit`);
		await page.waitForLoadState('networkidle');
		await postOverriding(page, 'updateEvent', NAME, {
			startDate: '2030-06-10',
			endDate: '2030-06-01'
		});

		expect(await getEventDates(eventId)).toEqual(before);
	});
});
