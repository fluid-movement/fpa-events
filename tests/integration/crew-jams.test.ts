import { test, expect, type Page } from '@playwright/test';
import {
	addCrewMember,
	closeDb,
	createTestCrew,
	deleteCrewsInCountry,
	deleteUserByEmail,
	getTestUserId,
	sql
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { signUpAndSignIn } from './helpers/auth';
import { captureRemoteForm, postRemoteForm, callRemoteForm } from './helpers/forms';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';

installErrorGuard(test);
const COUNTRY = 'JamTestland';
const MEMBER = { email: 'jam-member@playwright.local', password: 'playwright-test-pw-123' };

async function openJams(page: Page, crewId: string) {
	await page.goto(`/crews/${crewId}/admin/jams`);
	await page.waitForLoadState('networkidle');
}
async function jams(crewId: string) {
	return sql()`SELECT * FROM crew_jams WHERE crew_id = ${crewId} ORDER BY weekday, start_time`;
}
const valid = {
	weekday: '1',
	startTime: '19:00',
	name: 'Test Park',
	address: 'Park Road',
	latitude: '52.5',
	longitude: '13.4',
	note: 'First Tuesday of the month'
};

test.describe('crew regular jams', () => {
	let crewId: string;
	test.beforeEach(async () => {
		await deleteCrewsInCountry(COUNTRY);
		crewId = await createTestCrew(await getTestUserId(TEST_USER.email), 'Jam City', COUNTRY);
	});
	test.afterAll(async () => {
		await deleteCrewsInCountry(COUNTRY);
		await deleteUserByEmail(MEMBER.email);
		await closeDb();
	});

	test('admin adds, edits and deletes a jam, with details and listing display', async ({
		page
	}) => {
		await openJams(page, crewId);
		// Native remote submissions keep Kit's encoded fields, including picker state.
		await postRemoteForm(page, await captureRemoteForm(page, 'saveJam'), valid);
		await expect.poll(async () => (await jams(crewId)).length).toBe(1);
		const [jam] = await jams(crewId);
		await page.goto(`/crews/${crewId}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId(`crew-jam-${jam.id}`)).toContainText('Tuesday 19:00');
		await expect(
			page.getByTestId(`crew-jam-${jam.id}`).getByRole('link', { name: 'Test Park' })
		).toHaveAttribute('href', /mlat=52.5&mlon=13.4/);
		await expect(page.getByTestId('crew-jams')).toContainText(valid.note);
		await page.goto('/crews');
		await page.waitForLoadState('networkidle');
		await expect(
			page.getByTestId('crew-card').filter({ hasText: 'Jam City' }).getByTestId('crew-next-jam')
		).toHaveText('Next jam: Tue 19:00');

		await openJams(page, crewId);
		await page.getByTestId(`edit-jam-${jam.id}`).click();
		await page.getByTestId('jam-weekday').selectOption('4');
		await page.getByTestId('jam-time').fill('18:30');
		await page.getByLabel('Venue name').fill('New Park');
		await page.getByTestId('jam-note').fill('Every week');
		await page.getByTestId('save-jam').click();
		await page.waitForLoadState('networkidle');
		await expect.poll(async () => (await jams(crewId))[0]?.venue_name).toBe('New Park');
		await page.goto(`/crews/${crewId}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('crew-jams')).toContainText('Friday 18:30');
		await expect(page.getByTestId('crew-jams')).toContainText('Every week');

		await openJams(page, crewId);
		await page.getByTestId(`delete-jam-${jam.id}`).click();
		await page.getByTestId(`confirm-delete-jam-${jam.id}`).click();
		await page.waitForLoadState('networkidle');
		await expect.poll(async () => (await jams(crewId)).length).toBe(0);
		await page.goto(`/crews/${crewId}`);
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('crew-jams')).toHaveCount(0);
	});

	test('server rejects invalid times and weekdays and caps jams at ten', async ({ page }) => {
		expectConsoleErrors(page);
		await openJams(page, crewId);
		const form = await captureRemoteForm(page, 'saveJam');
		for (const overrides of [{ startTime: '24:00' }, { weekday: '7' }, { weekday: '1.5' }]) {
			const response = await postRemoteForm(page, form, { ...valid, ...overrides });
			expect(response.status()).toBe(400);
		}
		await expect.poll(async () => (await jams(crewId)).length).toBe(0);
		for (let i = 0; i < 10; i++) {
			await postRemoteForm(page, form, { ...valid, name: `Park ${i}` });
		}
		await expect.poll(async () => (await jams(crewId)).length).toBe(10);
		const refused = await callRemoteForm(page, form, valid);
		expect(refused.type).toBe('error');
		expect(refused.error.status).toBe(400);
		await expect.poll(async () => (await jams(crewId)).length).toBe(10);
	});

	test('members cannot add, edit or delete even by replaying an admin form', async ({
		page,
		context
	}) => {
		expectConsoleErrors(page);
		await openJams(page, crewId);
		const add = await captureRemoteForm(page, 'saveJam');
		await postRemoteForm(page, add, valid);
		await expect.poll(async () => (await jams(crewId)).length).toBe(1);
		const [jam] = await jams(crewId);
		await openJams(page, crewId);
		const remove = await captureRemoteForm(page, 'deleteJam');
		await page.getByTestId(`edit-jam-${jam.id}`).click();
		const edit = await captureRemoteForm(page, 'saveJam');

		await signUpAndSignIn(page, context, MEMBER);
		await addCrewMember(crewId, await getTestUserId(MEMBER.email), 'member');
		expect((await page.goto(`/crews/${crewId}/admin/jams`))?.status()).toBe(403);
		await page.waitForLoadState('networkidle');
		for (const [form, overrides] of [
			[add, valid],
			[edit, { ...valid, name: 'Forbidden' }],
			[remove, {}]
		] as const) {
			const response = await callRemoteForm(page, form, overrides);
			expect(response.type).toBe('error');
			expect(response.error.status).toBe(403);
		}
		await expect
			.poll(async () => (await jams(crewId)).map((row) => row.venue_name))
			.toEqual(['Test Park']);
	});
});
