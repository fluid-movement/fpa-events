import { test, expect } from '@playwright/test';
import {
	closeDb,
	countEventLocations,
	createTestEvent,
	deleteEventLocations,
	deleteEventsByName,
	deleteTestEvent,
	getEventDescription,
	getEventIdByName,
	getEventLocation,
	getTestUserId,
	insertEventLocation,
	pointEventAtLocation,
	setOrganizing
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';
import { openCreateEventPage, pickEventDateRange, postOverriding } from './helpers/forms';

installErrorGuard(test);

const COUNTRY = 'Inputland';
const CREATED = 'Input Hardening Created Event';
const OWN = 'Input Hardening Own Event';

/**
 * Event-form input that reaches shared state: the city-level `event_locations`
 * rows every event points at, and the stored description. The geocoder fields
 * are hidden inputs, so a hand-made POST (postOverriding) decides them.
 */
test.describe('event form input hardening', () => {
	let userId: string;
	const eventIds: string[] = [];

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
	});

	test.afterEach(async () => {
		for (const id of eventIds.splice(0)) await deleteTestEvent(id);
		await deleteEventsByName(CREATED);
		await deleteEventLocations(COUNTRY);
	});

	test.afterAll(closeDb);

	async function ownEvent(): Promise<string> {
		const id = await createTestEvent(userId, { name: OWN });
		await setOrganizing(id, userId);
		eventIds.push(id);
		return id;
	}

	async function submitEdit(
		page: import('@playwright/test').Page,
		id: string,
		overrides: Record<string, string>
	) {
		await page.goto(`/events/${id}/admin/edit`);
		await page.waitForLoadState('networkidle');
		await postOverriding(page, 'updateEvent', OWN, overrides);
	}

	for (const [latitude, longitude] of [
		['NaN', '10'],
		['Infinity', '10'],
		['10', '-Infinity'],
		['1e999', '10'],
		['1000', '10'],
		['10', '181'],
		['-90.5', '10']
	]) {
		test(`rejects coordinates ${latitude}, ${longitude} and writes no location row`, async ({
			page
		}) => {
			expectConsoleErrors(page);
			const id = await ownEvent();
			await submitEdit(page, id, { city: 'Badville', country: COUNTRY, latitude, longitude });

			expect(await getEventLocation(id)).toBeNull();
			expect(await countEventLocations(COUNTRY)).toBe(0);
		});
	}

	test('rejects an over-long city', async ({ page }) => {
		expectConsoleErrors(page);
		const id = await ownEvent();
		await submitEdit(page, id, {
			city: 'x'.repeat(101),
			country: COUNTRY,
			latitude: '10',
			longitude: '10'
		});

		expect(await countEventLocations(COUNTRY)).toBe(0);
	});

	test('a planted city cannot decide where another event is pinned', async ({ page }) => {
		const planted = await insertEventLocation('Plantville', COUNTRY, 0, 0);
		const id = await ownEvent();
		await submitEdit(page, id, {
			city: 'Plantville',
			country: COUNTRY,
			latitude: '48.85',
			longitude: '2.35'
		});

		// The event gets the position it submitted, in its own row; the planted
		// row is neither reused nor moved.
		await expect.poll(async () => (await getEventLocation(id))?.id).not.toBeUndefined();
		const location = await getEventLocation(id);
		expect(location!.id).not.toBe(planted);
		expect(location!.latitude).toBeCloseTo(48.85, 2);
		expect(await countEventLocations(COUNTRY)).toBe(2);
	});

	test('the same city at the same coordinates shares one row', async ({ page }) => {
		const first = await ownEvent();
		const second = await ownEvent();
		const fields = { city: 'Shareville', country: COUNTRY, latitude: '48.85', longitude: '2.35' };
		await submitEdit(page, first, fields);
		await expect.poll(() => getEventLocation(first)).not.toBeNull();
		await submitEdit(page, second, fields);
		await expect.poll(() => getEventLocation(second)).not.toBeNull();

		expect((await getEventLocation(first))!.id).toBe((await getEventLocation(second))!.id);
		expect(await countEventLocations(COUNTRY)).toBe(1);
	});

	test('the home map survives a stored non-finite coordinate', async ({ page }) => {
		const good = await ownEvent();
		const bad = await ownEvent();
		await pointEventAtLocation(good, await insertEventLocation('Goodville', COUNTRY, 10, 10));
		await pointEventAtLocation(bad, await insertEventLocation('Nanville', COUNTRY, 'NaN', 'NaN'));

		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Without the finite check Leaflet throws `Invalid LatLng object` on the NaN
		// marker, which the error guard reports; the good marker must still be drawn
		// (other specs' events may add markers of their own, so not an exact count).
		await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
	});

	test('createEvent stores a sanitized description', async ({ page }) => {
		await openCreateEventPage(page);
		await page.getByLabel('Event name').fill(CREATED);
		await pickEventDateRange(page);
		await postOverriding(page, 'createEvent', CREATED, {
			description:
				'<p onclick="alert(1)">Hello</p><script>alert(2)</script><img src=x onerror=alert(3)>'
		});

		await expect.poll(() => getEventIdByName(CREATED)).not.toBeNull();
		const description = await getEventDescription((await getEventIdByName(CREATED))!);
		expect(description).toContain('Hello');
		expect(description).not.toMatch(/<script|onclick|onerror|alert/i);
	});

	test('updateEvent stores a sanitized description', async ({ page }) => {
		const id = await ownEvent();
		await submitEdit(page, id, {
			description:
				'<p>Kept</p><script>alert(2)</script><a href="javascript:alert(1)" onclick="x()">l</a>'
		});

		await expect.poll(() => getEventDescription(id)).toContain('Kept');
		expect(await getEventDescription(id)).not.toMatch(/<script|onclick|javascript:|alert/i);
	});
});
