import { test, expect } from '@playwright/test';
import { getTestUserId, createTestEvent, deleteTestEvent, sql, closeDb } from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { installErrorGuard } from './helpers/console';

installErrorGuard(test);

/**
 * Event descriptions are rendered with {@html}. The legacy import stores them
 * raw, so the defense is sanitize-on-read: a row that never went through the
 * write-side check must still render inert, on the public page and in the
 * manage area. Written straight to the DB to stand in for such a row.
 */
test.describe('stored event descriptions render inert', () => {
	const PAYLOAD =
		'<p>Legacy description</p><img src="x" onerror="window.__xss = true">' +
		'<script>window.__xss = true</script>';
	let eventId: string;

	test.beforeEach(async () => {
		const userId = await getTestUserId(TEST_USER.email);
		eventId = await createTestEvent(userId, { name: 'Description Sanitize Spec Event' });
		await sql()`UPDATE events SET description = ${PAYLOAD} WHERE id = ${eventId}`;
	});

	test.afterEach(async () => {
		await deleteTestEvent(eventId);
	});

	test.afterAll(async () => {
		await closeDb();
	});

	for (const [label, path] of [
		['the public event page', (id: string) => `/events/${id}`],
		['the manage area', (id: string) => `/events/${id}/admin`]
	] as const) {
		test(`${label} strips markup from the description`, async ({ page }) => {
			await page.goto(path(eventId));
			await page.waitForLoadState('networkidle');

			await expect(page.getByText('Legacy description')).toBeVisible();
			await expect(page.locator('img[onerror]')).toHaveCount(0);
			await expect(page.locator('main script')).toHaveCount(0);
			expect(await page.evaluate(() => (window as { __xss?: boolean }).__xss)).toBeUndefined();
		});
	}
});
