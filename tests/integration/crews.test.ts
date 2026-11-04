import { test, expect, type Page } from '@playwright/test';
import {
	addCrewMember,
	closeDb,
	deleteCrewsInCountry,
	deleteUserByEmail,
	getCrewIdByName,
	getCrewMemberRole,
	getTestUserId
} from './helpers/db';
import { signUpAndSignIn } from './helpers/auth';
import { TEST_USER } from './helpers/constants';
import { installErrorGuard, expectConsoleErrors } from './helpers/console';

installErrorGuard(test);

const COUNTRY = 'Crewland';
const CITY = 'Crewtown';
const CREW = 'Playwright Crew';
const OTHER = { email: 'crew-other@playwright.local', password: 'playwright-test-pw-123' };

/**
 * One crew per city and one crew per user are database constraints the form
 * has to surface as friendly messages, and only admins may edit. Photon is
 * stubbed: the city picker is the only way to fill the hidden city fields, and
 * a live geocoder would make every run depend on it.
 */
async function stubGeocoder(page: Page, city: string) {
	await page.route('https://photon.komoot.io/**', (route) =>
		route.fulfill({
			json: {
				features: [
					{
						geometry: { coordinates: [13.4, 52.5] },
						properties: { name: city, city, country: COUNTRY }
					}
				]
			}
		})
	);
}

async function createCrew(page: Page, name: string, city: string) {
	await stubGeocoder(page, city);
	await page.goto('/crews/create');
	await page.waitForLoadState('networkidle');
	await page.getByTestId('crew-name').fill(name);
	await page.getByPlaceholder('Search for a city...').fill(city);
	await page.getByRole('option').first().getByRole('button').click();
	await page.getByTestId('crew-submit').click();
	await page.waitForLoadState('networkidle');
}

test.describe('crews', () => {
	let userId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
	});

	test.beforeEach(async () => {
		await deleteCrewsInCountry(COUNTRY);
	});

	test.afterAll(async () => {
		await deleteCrewsInCountry(COUNTRY);
		await deleteUserByEmail(OTHER.email);
		await closeDb();
	});

	test('creating a crew makes the creator its admin', async ({ page }) => {
		await createCrew(page, CREW, CITY);

		await expect(page).toHaveURL(/\/crews\/[a-z0-9]+\/admin$/);
		const crewId = await getCrewIdByName(CREW);
		expect(crewId).toBeTruthy();
		await expect.poll(() => getCrewMemberRole(crewId!, userId)).toBe('admin');
	});

	test('a city can only have one crew, and the refusal links to it', async ({ page, context }) => {
		await createCrew(page, CREW, CITY);
		await expect.poll(() => getCrewIdByName(CREW)).not.toBeNull();
		const crewId = (await getCrewIdByName(CREW))!;

		await signUpAndSignIn(page, context, OTHER);
		await createCrew(page, 'Second Crew', CITY);

		await expect(page.getByText('This city already has a crew.')).toBeVisible();
		await expect(page.getByTestId('existing-crew')).toHaveAttribute('href', `/crews/${crewId}`);
		expect(await getCrewIdByName('Second Crew')).toBeNull();
	});

	test('a user can only belong to one crew', async ({ page }) => {
		await createCrew(page, CREW, CITY);
		await expect.poll(() => getCrewIdByName(CREW)).not.toBeNull();
		await createCrew(page, 'Second Crew', 'Othertown');

		await expect(page.getByText('You already belong to a crew.')).toBeVisible();
		expect(await getCrewIdByName('Second Crew')).toBeNull();
	});

	test('a member who is not an admin cannot edit the crew', async ({ page, context }) => {
		expectConsoleErrors(page);
		await createCrew(page, CREW, CITY);
		await expect.poll(() => getCrewIdByName(CREW)).not.toBeNull();
		const crewId = (await getCrewIdByName(CREW))!;

		await signUpAndSignIn(page, context, OTHER);
		const otherId = await getTestUserId(OTHER.email);
		await addCrewMember(crewId, otherId, 'member');

		const response = await page.goto(`/crews/${crewId}/admin`);
		expect(response?.status()).toBe(403);
	});
});
