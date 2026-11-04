import { test, expect, type Page } from '@playwright/test';
import { signUpAndSignIn } from './helpers/auth';
import {
	addCrewMember,
	closeDb,
	createTestCrew,
	createTestUser,
	deleteCrewsInCountry,
	deleteEventsByName,
	deleteUserByEmail,
	getEventHost,
	getTestUserId,
	sql
} from './helpers/db';
import { openCreateEventPage, pickEventDateRange } from './helpers/forms';
import { installErrorGuard } from './helpers/console';

installErrorGuard(test);

const COUNTRY = 'Hosted Crew Spec Country';
const CREW = 'Hosted Crew Spec';
const EVENT = 'Hosted Crew Spec Event';
const ACTOR = { email: 'hosted-crew-actor@playwright.local', password: 'hosted-crew-password-123' };
const ADMIN_EMAIL = 'hosted-crew-admin@playwright.local';

async function open(page: Page, path: string) {
	await page.goto(path);
	await page.waitForLoadState('networkidle');
}

async function submitEvent(page: Page) {
	await page.getByLabel('Event name', { exact: true }).fill(EVENT);
	await pickEventDateRange(page);
	await page.getByRole('button', { name: 'Create event', exact: true }).click();
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveURL(/\/events\/[a-z0-9]+\/admin$/);
	return page.url().match(/\/events\/([a-z0-9]+)\/admin$/)![1];
}

async function expectCardBadge(page: Page, visible: boolean, crewId: string) {
	await open(page, '/events');
	const card = page
		.locator('.card-link')
		.filter({ has: page.getByRole('heading', { name: EVENT, exact: true }) });
	await expect(card).toHaveCount(1);
	const badge = card.getByTestId('host-crew-badge');
	await expect(badge).toHaveCount(visible ? 1 : 0);
	if (visible) {
		await expect(badge).toHaveAttribute('href', `/crews/${crewId}`);
		await badge.click();
		await page.waitForLoadState('networkidle');
		await expect(page).toHaveURL(`/crews/${crewId}`);
	}
}

test.describe('events hosted by a crew', () => {
	let actorId: string;

	test.beforeEach(async ({ page, context }) => {
		await deleteEventsByName(EVENT);
		await deleteCrewsInCountry(COUNTRY);
		await signUpAndSignIn(page, context, ACTOR);
		actorId = await getTestUserId(ACTOR.email);
	});

	test.afterAll(async () => {
		await deleteEventsByName(EVENT);
		await deleteCrewsInCountry(COUNTRY);
		await deleteUserByEmail(ACTOR.email);
		await deleteUserByEmail(ADMIN_EMAIL);
		await closeDb();
	});

	test('admin hosting defaults on; edits hide and restore badges without reassigning the crew', async ({
		page
	}) => {
		const crewId = await createTestCrew(actorId, CREW, COUNTRY);
		await openCreateEventPage(page);
		await expect(page.getByTestId('show-crew')).toBeChecked();
		const eventId = await submitEvent(page);
		await expect.poll(() => getEventHost(eventId)).toEqual({ crewId, showCrew: true });

		await open(page, `/events/${eventId}`);
		await expect(page.getByTestId('host-crew-badge')).toHaveAttribute('href', `/crews/${crewId}`);
		await expectCardBadge(page, true, crewId);

		// Moving the organizer to another crew must not move the event's host.
		await sql()`DELETE FROM crew_members WHERE user_id = ${actorId}`;
		await createTestCrew(actorId, 'New Hosted Crew', COUNTRY);
		await open(page, `/events/${eventId}/admin/edit`);
		await expect(page.getByTestId('show-crew')).toBeChecked();
		await page.getByTestId('show-crew').uncheck();
		await page.getByTestId('save-details').click();
		await page.waitForLoadState('networkidle');
		await expect.poll(() => getEventHost(eventId)).toEqual({ crewId, showCrew: false });
		await open(page, `/events/${eventId}`);
		await expect(page.getByTestId('host-crew-badge')).toHaveCount(0);
		await expectCardBadge(page, false, crewId);

		await open(page, `/events/${eventId}/admin/edit`);
		await expect(page.getByTestId('show-crew')).not.toBeChecked();
		await page.getByTestId('show-crew').check();
		await page.getByTestId('save-details').click();
		await page.waitForLoadState('networkidle');
		await expect.poll(() => getEventHost(eventId)).toEqual({ crewId, showCrew: true });
		await open(page, `/events/${eventId}`);
		await expect(page.getByTestId('host-crew-badge')).toHaveAttribute('href', `/crews/${crewId}`);
		await expectCardBadge(page, true, crewId);

		await sql()`DELETE FROM crews WHERE id = ${crewId}`;
		await expect.poll(() => getEventHost(eventId)).toEqual({ crewId: null, showCrew: true });
		await open(page, `/events/${eventId}`);
		await expect(page.getByTestId('host-crew-badge')).toHaveCount(0);
	});

	test('admin can hide hosting during creation while retaining the attachment', async ({
		page
	}) => {
		const crewId = await createTestCrew(actorId, CREW, COUNTRY);
		await openCreateEventPage(page);
		await page.getByTestId('show-crew').uncheck();
		const eventId = await submitEvent(page);
		await expect.poll(() => getEventHost(eventId)).toEqual({ crewId, showCrew: false });
		await open(page, `/events/${eventId}`);
		await expect(page.getByTestId('host-crew-badge')).toHaveCount(0);
		await expectCardBadge(page, false, crewId);
	});

	for (const membership of ['crewless', 'member'] as const) {
		test(`${membership} creators have no hosting toggle or badge`, async ({ page }) => {
			if (membership === 'member') {
				const adminId = await createTestUser(ADMIN_EMAIL);
				const crewId = await createTestCrew(adminId, CREW, COUNTRY);
				await addCrewMember(crewId, actorId, 'member');
			}
			await openCreateEventPage(page);
			await expect(page.getByTestId('show-crew')).toHaveCount(0);
			const eventId = await submitEvent(page);
			await expect.poll(() => getEventHost(eventId)).toEqual({ crewId: null, showCrew: true });
			await open(page, `/events/${eventId}`);
			await expect(page.getByTestId('host-crew-badge')).toHaveCount(0);
			await expectCardBadge(page, false, '');
			await open(page, `/events/${eventId}/admin/edit`);
			await expect(page.getByTestId('show-crew')).toHaveCount(0);
		});
	}
});
