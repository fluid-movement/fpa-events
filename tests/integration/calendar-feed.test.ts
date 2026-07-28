import { test, expect } from '@playwright/test';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	setAttending,
	clearAttending,
	getCalendarToken,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { installErrorGuard } from './helpers/console';

installErrorGuard(test);

/**
 * `/api/calendar/[token]/feed.ics` is the app's only public, token-scoped
 * endpoint: no session, no cookie, anyone holding the token reads the user's
 * attending list. That makes both halves worth pinning down — that a real token
 * returns the right events, and that a stale one stops working.
 *
 * Asserted with `request.get()` rather than `page.goto()`: this is an API
 * response, and the status code and content type are the point.
 */

const EVENT_NAME = 'Calendar Feed Event';

test.describe('calendar feed', () => {
	let userId: string;
	let eventId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
		eventId = await createTestEvent(userId, { name: EVENT_NAME });
		await setAttending(eventId, userId);
	});

	test.afterAll(async () => {
		await clearAttending(eventId, userId);
		await deleteTestEvent(eventId);
		await closeDb();
	});

	/** The token is minted lazily by ensureCalendarToken on these pages. */
	async function tokenAfterVisitingAttending(page: import('@playwright/test').Page) {
		await page.goto('/attending');
		await page.waitForLoadState('networkidle');
		const token = await getCalendarToken(userId);
		expect(token, 'visiting /attending should mint a calendar token').toBeTruthy();
		return token!;
	}

	test('serves the attending events as iCal', async ({ page }) => {
		const token = await tokenAfterVisitingAttending(page);

		const resp = await page.request.get(`/api/calendar/${token}/feed.ics`);
		expect(resp.status()).toBe(200);
		expect(resp.headers()['content-type']).toContain('text/calendar');

		const body = await resp.text();
		expect(body).toContain('BEGIN:VCALENDAR');
		expect(body).toContain('BEGIN:VEVENT');
		expect(body).toContain(EVENT_NAME);
	});

	test('is reachable without a session', async ({ page, context }) => {
		const token = await tokenAfterVisitingAttending(page);
		await context.clearCookies();

		const resp = await page.request.get(`/api/calendar/${token}/feed.ics`);
		expect(resp.status()).toBe(200);
		expect(await resp.text()).toContain(EVENT_NAME);
	});

	test('an unknown token is a 404', async ({ page }) => {
		const resp = await page.request.get('/api/calendar/not-a-real-token/feed.ics');
		expect(resp.status()).toBe(404);
	});

	test('regenerating the link stops the old token working', async ({ page }) => {
		const oldToken = await tokenAfterVisitingAttending(page);

		await page.getByTestId('regenerate-calendar-link').click();
		await page.getByTestId('confirm-regenerate-calendar').click();
		await page.waitForLoadState('networkidle');

		await expect.poll(() => getCalendarToken(userId)).not.toBe(oldToken);
		const newToken = await getCalendarToken(userId);

		expect((await page.request.get(`/api/calendar/${oldToken}/feed.ics`)).status()).toBe(404);
		expect((await page.request.get(`/api/calendar/${newToken}/feed.ics`)).status()).toBe(200);
	});
});
