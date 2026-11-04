import { test, expect } from '@playwright/test';
import {
	addCrewMember,
	closeDb,
	createTestCrew,
	createTestEvent,
	createTestUser,
	deleteCrewsInCountry,
	deleteTestEvent,
	deleteUserByEmail,
	getCrewCityId,
	insertEventLocation,
	pointEventAtLocation,
	setAttending,
	setOrganizing,
	setShowName
} from './helpers/db';
import { installErrorGuard } from './helpers/console';

installErrorGuard(test);
const COUNTRY = 'Crew Stats Testland';
const ADMIN = 'crew-stats-admin@playwright.local';
const MEMBER = 'crew-stats-member@playwright.local';

test.describe('crew city stats', () => {
	let adminId: string;
	let memberId: string;
	const eventIds: string[] = [];
	test.beforeAll(async () => {
		adminId = await createTestUser(ADMIN, 'Stats Admin');
		memberId = await createTestUser(MEMBER, 'Stats Hidden Member');
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

	test('counts city jams and attending RSVPs, including hidden members, excluding other cities', async ({
		page,
		context
	}) => {
		await context.clearCookies();
		const crewId = await createTestCrew(adminId, 'Stats City', COUNTRY);
		await addCrewMember(crewId, memberId, 'member');
		const cityId = await getCrewCityId(crewId);
		const otherCity = await insertEventLocation('Other Stats City', COUNTRY, 50, 10);
		const year = new Date().getFullYear();
		async function event(name: string, startDate: Date, endDate: Date, location = cityId) {
			const id = await createTestEvent(adminId, { name, startDate, endDate });
			eventIds.push(id);
			await pointEventAtLocation(id, location);
			return id;
		}
		const first = await event(
			'First summer jam',
			new Date(year - 2, 6, 10),
			new Date(year - 2, 6, 11)
		);
		const biggest = await event(
			'Big summer jam',
			new Date(year - 1, 6, 10),
			new Date(year - 1, 6, 11)
		);
		await event('Next summer jam', new Date(year + 1, 6, 10), new Date(year + 1, 6, 11));
		// An ongoing jam belongs to upcoming, just as it does in the city's event list.
		await event('Still jamming', new Date(Date.now() - 86400000), new Date(Date.now() + 86400000));
		const outsider = await event(
			'Other city giant',
			new Date(year - 10, 0, 10),
			new Date(year - 10, 0, 11),
			otherCity
		);
		await setAttending(first, memberId);
		await setOrganizing(first, adminId);
		await setAttending(biggest, memberId);
		await setAttending(biggest, adminId);
		await setAttending(outsider, memberId);
		await setAttending(outsider, adminId);
		await page.goto(`/crews/${crewId}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('crew-stat-members')).toContainText('2');
		await expect(page.getByTestId('crew-stat-past')).toContainText('2');
		await expect(page.getByTestId('crew-stat-upcoming')).toContainText('2');
		await expect(page.getByTestId('crew-stat-rsvps')).toContainText('3');
		await expect(page.getByTestId('crew-stat-years')).toContainText('3 years of jams');
		await expect(page.getByTestId('crew-stat-month')).toContainText('July');
		await expect(page.getByTestId('crew-stat-biggest')).toContainText('Big summer jam (2 players)');
		await expect(page.getByTestId('crew-stats')).not.toContainText('Other city giant');
	});

	test('shows friendly zero states when the crew city has no events', async ({ page, context }) => {
		await context.clearCookies();
		const crewId = await createTestCrew(adminId, 'Empty Stats City', COUNTRY);
		await page.goto(`/crews/${crewId}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('crew-stat-members')).toContainText('1');
		for (const stat of ['past', 'upcoming', 'rsvps']) {
			await expect(page.getByTestId(`crew-stat-${stat}`)).toContainText('0');
		}
		await expect(page.getByTestId('crew-stat-years')).toContainText('The story starts here');
		await expect(page.getByTestId('crew-stat-month')).toContainText('Your month is waiting');
		await expect(page.getByTestId('crew-stat-biggest')).toContainText('The first jam awaits');
	});
});
