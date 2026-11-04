import { test, expect } from '@playwright/test';
import { ulid } from 'ulid';
import {
	addCrewMember,
	closeDb,
	createTestEvent,
	deleteCrewsInCountry,
	deleteTestEvent,
	getTestUserId,
	insertEventLocation,
	pointEventAtLocation,
	sql
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { installErrorGuard } from './helpers/console';

installErrorGuard(test);

const COUNTRY = 'StartCrewCardland';
const CITY = 'StartCrewCardtown';

test.describe('start a crew from event management', () => {
	let userId: string;
	let eventId: string;
	let cityId: number;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
	});

	test.beforeEach(async () => {
		await deleteCrewsInCountry(COUNTRY);
		cityId = await insertEventLocation(CITY, COUNTRY, 52.5, 13.4);
		eventId = await createTestEvent(userId);
		await pointEventAtLocation(eventId, cityId);
	});

	test.afterEach(async () => {
		await deleteTestEvent(eventId);
		await deleteCrewsInCountry(COUNTRY);
	});

	test.afterAll(async () => {
		await closeDb();
	});

	async function seedCrew(locationId: number) {
		const id = ulid().toLowerCase();
		await sql()`INSERT INTO crews (id, name, city_id) VALUES (${id}, 'Suggested Crew', ${locationId})`;
		return id;
	}

	test('shows for a manager and opens a prefilled, submittable crew form', async ({ page }) => {
		await page.goto(`/events/${eventId}/admin`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('start-crew-card')).toBeVisible();
		await expect(page.getByTestId('start-crew-link')).toHaveAttribute(
			'href',
			`/crews/create?city=${cityId}`
		);
		await page.getByTestId('start-crew-link').click();
		await page.waitForLoadState('networkidle');
		await expect(page.getByPlaceholder('Search for a city...')).toHaveValue(`${CITY}, ${COUNTRY}`);
		await page.getByTestId('crew-name').fill('Prefilled Crew');
		await page.getByTestId('crew-submit').click();
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(/\/crews\/[a-z0-9]+\/admin$/);
		await expect
			.poll(async () => {
				const [crew] = await sql()<{ city_id: number }[]>`
				SELECT city_id FROM crews WHERE name = 'Prefilled Crew' AND city_id = ${cityId}
			`;
				return crew?.city_id;
			})
			.toBe(cityId);
	});

	test('hides once the event city has a crew', async ({ page }) => {
		await page.goto(`/events/${eventId}/admin`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('start-crew-card')).toBeVisible();
		await seedCrew(cityId);
		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('start-crew-card')).toHaveCount(0);
	});

	test('hides when the manager belongs to a crew in another city', async ({ page }) => {
		const otherCity = await insertEventLocation('OtherCrewCardtown', COUNTRY, 51, 12);
		const crewId = await seedCrew(otherCity);
		await addCrewMember(crewId, userId, 'member');
		await page.goto(`/events/${eventId}/admin`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('start-crew-card')).toHaveCount(0);
	});

	test('dismissal survives tabs and reload but is scoped to the event', async ({ page }) => {
		await page.goto(`/events/${eventId}/admin`);
		await page.waitForLoadState('networkidle');
		await page.getByTestId('dismiss-start-crew').click();
		await expect(page.getByTestId('start-crew-card')).toHaveCount(0);
		await page.getByTestId('manage-tab-attendees').click();
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('start-crew-card')).toHaveCount(0);
		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('start-crew-card')).toHaveCount(0);

		const otherEvent = await createTestEvent(userId);
		try {
			await pointEventAtLocation(otherEvent, cityId);
			await page.goto(`/events/${otherEvent}/admin`);
			await page.waitForLoadState('networkidle');
			await expect(page.getByTestId('start-crew-card')).toBeVisible();
		} finally {
			await deleteTestEvent(otherEvent);
		}
	});

	test('storage failures still allow showing and dismissing the card', async ({ page }) => {
		await page.addInitScript(() => {
			const getItem = Storage.prototype.getItem;
			const setItem = Storage.prototype.setItem;
			Storage.prototype.getItem = function (key) {
				if (key.startsWith('event-start-crew-dismissed:')) throw new Error('Storage unavailable');
				return getItem.call(this, key);
			};
			Storage.prototype.setItem = function (key, value) {
				if (key.startsWith('event-start-crew-dismissed:')) throw new Error('Storage unavailable');
				setItem.call(this, key, value);
			};
		});
		await page.goto(`/events/${eventId}/admin`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('start-crew-card')).toBeVisible();
		await page.getByTestId('dismiss-start-crew').click();
		await expect(page.getByTestId('start-crew-card')).toHaveCount(0);
	});

	test('hides for events without a city and on the public event page', async ({ page }) => {
		await page.goto(`/events/${eventId}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('start-crew-card')).toHaveCount(0);
		await sql()`UPDATE events SET city_id = NULL WHERE id = ${eventId}`;
		await page.goto(`/events/${eventId}/admin`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('start-crew-card')).toHaveCount(0);
	});

	for (const city of ['not-a-number', '2147483647', '999999999999999999999']) {
		test(`ignores an invalid or unknown city prefill: ${city}`, async ({ page }) => {
			await page.goto(`/crews/create?city=${city}`);
			await page.waitForLoadState('networkidle');
			await expect(page.getByPlaceholder('Search for a city...')).toHaveValue('');
		});
	}
});
