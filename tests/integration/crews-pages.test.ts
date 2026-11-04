import { test, expect } from '@playwright/test';
import {
	addCrewMember,
	closeDb,
	createTestCrew,
	createTestCrewAtCity,
	createTestEvent,
	createTestUser,
	deleteCrewsInCountry,
	deleteTestEvent,
	deleteUserByEmail,
	getCrewCityId,
	insertEventLocation,
	pointEventAtLocation,
	setAttending,
	setShowName,
	withEmptyCrewListing
} from './helpers/db';
import { installErrorGuard } from './helpers/console';

installErrorGuard(test);

const COUNTRY = 'Crew Pages Testland';
const CITY = 'Crew Pages City';
const ADMIN = 'crew-pages-admin@playwright.local';
const MEMBER = 'crew-pages-member@playwright.local';

test.describe('public crew pages', () => {
	let adminId: string;
	let memberId: string;
	const eventIds: string[] = [];

	test.beforeAll(async () => {
		adminId = await createTestUser(ADMIN, 'Crew Pages Admin');
		memberId = await createTestUser(MEMBER, 'Hidden Crew Pages Member');
		await setShowName(memberId, false);
	});

	test.afterEach(async () => {
		for (const id of eventIds.splice(0)) await deleteTestEvent(id);
		await deleteCrewsInCountry(COUNTRY);
	});

	test.afterAll(async () => {
		await deleteUserByEmail(ADMIN);
		await deleteUserByEmail(MEMBER);
		await closeDb();
	});

	test('listing links to public details, counts hidden members, and ignores invalid map coordinates', async ({
		page,
		context
	}) => {
		await context.clearCookies();
		const crewId = await createTestCrew(adminId, CITY, COUNTRY);
		await addCrewMember(crewId, memberId, 'member');
		const badCity = await insertEventLocation('No coordinates', COUNTRY, 'NaN', 'NaN');
		// A crew need not have members to appear in the listing (LEFT JOIN).
		await createTestCrewAtCity(badCity, 'Unlocated crew');
		await page.goto('/crews');
		await page.waitForLoadState('networkidle');
		const card = page.getByTestId('crew-card').filter({ hasText: CITY });
		await expect(card).toHaveAttribute('href', `/crews/${crewId}`);
		await expect(card).toContainText('2 members');
		await expect(page.getByTestId('crew-card').filter({ hasText: 'Unlocated crew' })).toContainText(
			'0 members'
		);
		await expect(
			page.getByTestId('crews-map').locator(`.leaflet-marker-icon[title="${CITY}"]`)
		).toBeVisible();
		await expect(
			page.getByTestId('crews-map').locator('.leaflet-marker-icon[title="Unlocated crew"]')
		).toHaveCount(0);
		await card.click();
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(`/crews/${crewId}`);
		await expect(page.getByTestId('crew-members')).toContainText('Crew Pages Admin');
		await expect(page.getByTestId('crew-members')).not.toContainText('Hidden Crew Pages Member');
		await expect(page.getByTestId('crew-hidden-count')).toContainText('+ 1 others');
		await expect(page.getByTestId('leave-crew')).toHaveCount(0);
	});

	test('details show ongoing, upcoming and paged past events only from the crew city', async ({
		page,
		context
	}) => {
		await context.clearCookies();
		const crewId = await createTestCrew(adminId, CITY, COUNTRY);
		const cityId = await getCrewCityId(crewId);
		const otherCity = await insertEventLocation('Other city', COUNTRY, 50, 10);
		const day = 86400000;
		const now = Date.now();
		async function event(name: string, start: number, end: number, location = cityId) {
			const id = await createTestEvent(adminId, {
				name,
				startDate: new Date(now + start * day),
				endDate: new Date(now + end * day)
			});
			eventIds.push(id);
			await pointEventAtLocation(id, location);
			return id;
		}
		await event('Later city event', 10, 11);
		const ongoing = await event('Ongoing city event', -1, 1);
		await setAttending(ongoing, memberId);
		await event('Soon city event', 2, 3);
		for (let i = 1; i <= 11; i++) await event(`Past city event ${i}`, -i - 1, -i);
		await event('Other city future', 1, 2, otherCity);
		await event('Other city past', -3, -2, otherCity);
		await page.goto(`/crews/${crewId}`);
		await page.waitForLoadState('networkidle');
		const upcoming = page.getByTestId('crew-upcoming-events');
		const past = page.getByTestId('crew-past-events');
		await expect(upcoming.locator('h2')).toHaveText([
			'Ongoing city event',
			'Soon city event',
			'Later city event'
		]);
		await expect(upcoming.locator(`a[href="/events/${ongoing}"]`)).toContainText('1');
		await expect(past.locator('h2')).toHaveText(
			Array.from({ length: 10 }, (_, i) => `Past city event ${i + 1}`)
		);
		await expect(page.getByText('Other city future', { exact: true })).toHaveCount(0);
		await expect(page.getByText('Other city past', { exact: true })).toHaveCount(0);
		await page.getByTestId('crew-older-events').click();
		await page.waitForLoadState('networkidle');
		await expect(past.locator('h2')).toHaveText(['Past city event 11']);
		await expect(upcoming.locator('h2')).toHaveCount(3);
		await page.getByRole('link', { name: 'Newer events' }).click();
		await page.waitForLoadState('networkidle');
		await expect(past.locator('h2')).toHaveCount(10);
	});

	test('empty listing invites visitors to start their city crew', async ({ page, context }) => {
		await context.clearCookies();
		await withEmptyCrewListing(async () => {
			await page.goto('/crews');
			await page.waitForLoadState('networkidle');
			await expect(page.getByTestId('crews-empty')).toContainText('Start the first crew');
			await expect(page.getByTestId('crews-empty').getByRole('link')).toHaveAttribute(
				'href',
				'/crews/create'
			);
			await expect(page.getByTestId('crew-card')).toHaveCount(0);
		});
	});
});
