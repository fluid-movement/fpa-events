import { test, expect } from '@playwright/test';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	createMagicLink,
	getEventUserStatus,
	createTestUser,
	deleteTestUser,
	getEventUserRows,
	setAttending,
	sql,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';
import {
	captureRemoteForm,
	postRemoteForm,
	openCreateEventPage,
	pickEventDateRange
} from './helpers/forms';

installErrorGuard(test);

test.describe('organizing status', () => {
	let userId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
	});

	test.afterAll(async () => {
		await closeDb();
	});

	test.describe('event creation auto-organizes creator', () => {
		let createdEventId: string;

		test.afterAll(async () => {
			if (createdEventId) await deleteTestEvent(createdEventId);
		});

		test('creator sees Organizing badge and no RSVP button after creating event', async ({
			page
		}) => {
			await openCreateEventPage(page);
			await page.getByLabel('Event name').fill('Organizing Test Event');
			// Location is left empty: it is optional, and filling it would mean
			// driving the geocoding combobox against photon.komoot.io.
			await pickEventDateRange(page);

			await page.getByRole('button', { name: 'Create event' }).click();
			await page.waitForLoadState('networkidle');

			// Creating an event lands the organizer in the manage area.
			//
			// Asserted with `expect(page).toHaveURL`, which retries, rather than a
			// one-shot `expect(page.url())`. `waitForLoadState('networkidle')` is no
			// help here: the page already reached networkidle before the submit, so it
			// returns immediately and the redirect has not happened yet.
			await expect(page).toHaveURL(/\/events\/[a-z0-9]+\/admin$/);
			createdEventId = page.url().split('/events/')[1].replace('/admin', '');

			await expect(page.getByTestId('setup-checklist')).toBeVisible();

			// The public page is where the RSVP controls live
			await page.goto(`/events/${createdEventId}`);
			await page.waitForLoadState('networkidle');

			// No RSVP button for the creator
			await expect(page.getByTestId('rsvp-button')).not.toBeVisible();

			// Organizing badge should be shown
			await expect(page.getByTestId('organizing-badge')).toBeVisible();
			await expect(page.getByTestId('organizing-badge')).toContainText('Organizing');

			// DB should have organizing status
			await expect.poll(() => getEventUserStatus(createdEventId, userId)).toBe('organizing');
		});
	});

	test.describe('magic link acceptance sets organizing status', () => {
		let eventId: string;
		let token: string;
		let ownerId: string;

		async function expireInvite() {
			// Drizzle stores/reads timestamp-without-time-zone values as UTC. A bare
			// now() cast uses the DB session zone (Berlin), leaving the link live.
			await sql()`UPDATE event_magic_links
				SET expires_at = (now() AT TIME ZONE 'UTC') - interval '1 second'
				WHERE id = ${token}`;
		}

		test.beforeEach(async () => {
			// The invitee must not already own the event (owners have no RSVP button).
			ownerId = await createTestUser(`invite-owner-${crypto.randomUUID()}@playwright.local`);
			eventId = await createTestEvent(ownerId, { name: 'Magic Link Organizing Event' });
			token = await createMagicLink(eventId);
		});

		test.afterEach(async () => {
			await deleteTestEvent(eventId);
			await deleteTestUser(ownerId);
		});

		test('GET and data preload leave membership unchanged until explicit acceptance', async ({
			page
		}) => {
			await page.goto(`/invite/${token}`);
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(`/invite/${token}`);
			await expect(
				page.getByText("You've been invited to co-organize Magic Link Organizing Event.")
			).toBeVisible();
			await expect.poll(() => getEventUserRows(eventId, userId)).toEqual([]);

			const preload = await page.request.get(`/invite/${token}/__data.json`);
			expect(preload.ok()).toBe(true);
			expect(await preload.text()).toContain('Magic Link Organizing Event');
			await expect.poll(() => getEventUserRows(eventId, userId)).toEqual([]);

			await page.getByTestId('accept-invite').click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(`/events/${eventId}`);
			await expect(page.getByTestId('rsvp-button')).not.toBeVisible();
			await expect(page.getByTestId('organizing-badge')).toBeVisible();
			await expect.poll(() => getEventUserRows(eventId, userId)).toEqual(['organizing']);
		});

		test('an existing RSVP is preserved on GET and upgraded only by Accept', async ({ page }) => {
			await setAttending(eventId, userId);
			await page.goto(`/invite/${token}`);
			await page.waitForLoadState('networkidle');
			await expect.poll(() => getEventUserRows(eventId, userId)).toEqual(['attending']);

			await page.getByTestId('accept-invite').click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(`/events/${eventId}`);
			await expect(page.getByTestId('organizing-badge')).toBeVisible();
			await expect.poll(() => getEventUserRows(eventId, userId)).toEqual(['organizing']);
		});

		test('a foreign-origin POST cannot redeem a valid invite', async ({ page }) => {
			expectConsoleErrors(page);
			await setAttending(eventId, userId);
			await page.goto(`/invite/${token}`);
			await page.waitForLoadState('networkidle');
			const form = await captureRemoteForm(page, 'acceptInvite');
			const rejected = await postRemoteForm(page, form, {}, 'https://attacker.example');
			expect(rejected.status()).toBe(403);
			await expect.poll(() => getEventUserRows(eventId, userId)).toEqual(['attending']);

			// The identical native payload works from this origin, without JS enhancement.
			const accepted = await postRemoteForm(page, form);
			expect(accepted.status()).toBe(303);
			await expect.poll(() => getEventUserRows(eventId, userId)).toEqual(['organizing']);
		});

		test('a captured form cannot be redeemed after signing out', async ({ page, context }) => {
			await page.goto(`/invite/${token}`);
			await page.waitForLoadState('networkidle');
			const form = await captureRemoteForm(page, 'acceptInvite');
			await context.clearCookies();
			const response = await postRemoteForm(page, form);
			expect(response.status()).toBe(302);
			expect(new URL(response.headers().location, response.url()).href).toBe(
				new URL('/sign-in', response.url()).href
			);
			await expect.poll(() => getEventUserRows(eventId, userId)).toEqual([]);
		});

		for (const invalidation of ['expired', 'regenerated'] as const) {
			test(`a link ${invalidation} after GET cannot be accepted`, async ({ page }) => {
				expectConsoleErrors(page);
				await setAttending(eventId, userId);
				await page.goto(`/invite/${token}`);
				await page.waitForLoadState('networkidle');
				const form = await captureRemoteForm(page, 'acceptInvite');
				if (invalidation === 'expired') {
					await expireInvite();
				} else {
					await sql()`DELETE FROM event_magic_links WHERE id = ${token}`;
					await createMagicLink(eventId);
				}
				const response = await postRemoteForm(page, form);
				expect(response.status()).toBe(invalidation === 'expired' ? 410 : 404);
				await expect.poll(() => getEventUserRows(eventId, userId)).toEqual(['attending']);
			});
		}

		test('an already expired link has no acceptance form', async ({ page }) => {
			await expireInvite();
			await page.goto(`/invite/${token}`);
			await page.waitForLoadState('networkidle');
			await expect(page.getByText('Invite link expired', { exact: true })).toBeVisible();
			await expect(page.getByTestId('accept-invite')).toHaveCount(0);
			await expect.poll(() => getEventUserRows(eventId, userId)).toEqual([]);
		});

		test('repeated acceptance keeps exactly one organizing seat', async ({ page }) => {
			await page.goto(`/invite/${token}`);
			await page.waitForLoadState('networkidle');
			const form = await captureRemoteForm(page, 'acceptInvite');
			for (let attempt = 0; attempt < 2; attempt++) {
				const response = await postRemoteForm(page, form);
				expect(response.status()).toBe(303);
				await expect.poll(() => getEventUserRows(eventId, userId)).toEqual(['organizing']);
			}
		});
	});
});
