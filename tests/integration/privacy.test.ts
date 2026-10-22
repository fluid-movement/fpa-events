import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { TEST_USER } from './helpers/constants';
import {
	getTestUserId,
	createTestUser,
	deleteTestUser,
	createTestEvent,
	deleteTestEvent,
	setAttending,
	setOrganizing,
	setShowAttendance,
	getShowAttendance,
	setUserRole,
	closeDb
} from './helpers/db';
import { installErrorGuard } from './helpers/console';
import { signUpAndSignIn } from './helpers/auth';

installErrorGuard(test);

async function signIn(page: Page, context: BrowserContext) {
	await context.clearCookies();
	const resp = await page.request.post('/api/auth/sign-in/email', {
		data: { email: TEST_USER.email, password: TEST_USER.password }
	});
	expect(resp.ok()).toBeTruthy();
	await context.addCookies((await page.request.storageState()).cookies);
}

test.describe('attendee name privacy', () => {
	let userId: string;
	let otherUserId: string;
	let eventId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
		await setUserRole(userId, 'user');
		otherUserId = await createTestUser('privacy-other@playwright.local', 'Wanda Privacy');
		eventId = await createTestEvent(userId, { name: 'Privacy Test Event' });
		// The test user organizes; the other user attends and will opt out.
		await setOrganizing(eventId, userId);
		await setAttending(eventId, otherUserId);
	});

	test.afterAll(async () => {
		await deleteTestEvent(eventId);
		await deleteTestUser(otherUserId);
		await closeDb();
	});

	test.beforeEach(async () => {
		await setShowAttendance(otherUserId, true);
		await setShowAttendance(userId, true);
	});

	test('an opted-in attendee is named on the public event page', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto(`/events/${eventId}`);
		await page.waitForLoadState('networkidle');

		await expect(page.getByText(/Wanda/)).toBeVisible();
	});

	test('an opted-out attendee is not named but still counted', async ({ page, context }) => {
		await setShowAttendance(otherUserId, false);
		await signIn(page, context);
		await page.goto(`/events/${eventId}`);
		await page.waitForLoadState('networkidle');

		// Name gone from the summary line...
		await expect(page.getByText(/Wanda/)).not.toBeVisible();
		// ...but the total still counts them.
		await expect(page.getByText(/1 person attending/)).toBeVisible();
	});

	test('an opted-out attendee is not listed in the attendees modal', async ({ page, context }) => {
		await setShowAttendance(otherUserId, false);
		await signIn(page, context);
		await page.goto(`/events/${eventId}`);
		await page.waitForLoadState('networkidle');

		await page.getByText(/1 person attending/).click();
		await expect(page.getByTestId('hidden-attendee-count')).toBeVisible();
		await expect(page.getByTestId('hidden-attendee-count')).toContainText('and 1 other');
		await expect(page.getByText('Wanda Privacy')).not.toBeVisible();
	});

	test('the owner still sees opted-out attendees and their emails in the manage area', async ({
		page,
		context
	}) => {
		await setShowAttendance(otherUserId, false);
		await signIn(page, context);
		await page.goto(`/events/${eventId}/admin/attendees`);
		await page.waitForLoadState('networkidle');

		// Opting out is a public-page setting only — organizers need the real list.
		await expect(page.getByText('Wanda Privacy')).toBeVisible();
		await expect(page.getByText('privacy-other@playwright.local')).toBeVisible();
	});

	test('the privacy switch persists and reflects the stored value', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto('/settings/privacy');
		await page.waitForLoadState('networkidle');

		const toggle = page.getByTestId('show-attendance-switch');
		await expect(toggle).toHaveAttribute('data-state', 'checked');

		// The save fetch starts a microtask after the click, so `networkidle` can
		// resolve before it even begins — poll the stored value instead.
		await toggle.click();
		await page.waitForLoadState('networkidle');
		await expect.poll(() => getShowAttendance(userId)).toBe(false);

		// Survives a reload
		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('show-attendance-switch')).toHaveAttribute(
			'data-state',
			'unchecked'
		);

		// And back on
		await page.getByTestId('show-attendance-switch').click();
		await page.waitForLoadState('networkidle');
		await expect.poll(() => getShowAttendance(userId)).toBe(true);
	});

	test('the Privacy tab is reachable from settings', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto('/settings/profile');
		await page.waitForLoadState('networkidle');
		// Scoped by testid: the sidebar footer also has a "Privacy" link (privacy-policy).
		await page.getByTestId('settings-tab-privacy').click();
		await expect(page).toHaveURL('/settings/privacy');
		await expect(page.getByTestId('show-attendance-switch')).toBeVisible();
	});
});

// Check the serialized response as well as the UI: hiding a column alone must
// never make this regression pass while addresses still reach the browser.
test.describe('manage-area attendee email privacy', () => {
	for (const viewer of ['owner', 'admin', 'co-organizer'] as const) {
		for (const showAttendance of [true, false]) {
			test(`${viewer} email access with public attendance ${showAttendance ? 'on' : 'off'}`, async ({
				page,
				context
			}) => {
				const suffix = crypto.randomUUID();
				const viewerEmail = `privacy-viewer-${suffix}@playwright.local`;
				const attendeeEmail = `privacy-attendee-${suffix}@playwright.local`;
				const organizerEmail = `privacy-organizer-${suffix}@playwright.local`;
				const ids: string[] = [];
				let managedEventId: string | undefined;
				try {
					await signUpAndSignIn(page, context, {
						email: viewerEmail,
						password: TEST_USER.password
					});
					const viewerId = await getTestUserId(viewerEmail);
					ids.push(viewerId);
					const ownerId =
						viewer === 'owner'
							? viewerId
							: await createTestUser(`privacy-owner-${suffix}@playwright.local`);
					if (ownerId !== viewerId) ids.push(ownerId);
					const attendeeId = await createTestUser(attendeeEmail, 'Private Attendee');
					ids.push(attendeeId);
					const organizerId = await createTestUser(organizerEmail, 'Other Organizer');
					ids.push(organizerId);
					managedEventId = await createTestEvent(ownerId);
					await setAttending(managedEventId, attendeeId);
					await setOrganizing(managedEventId, organizerId);
					await setShowAttendance(attendeeId, showAttendance);
					await setShowAttendance(organizerId, showAttendance);
					if (viewer === 'admin') await setUserRole(viewerId, 'admin');
					if (viewer === 'co-organizer') await setOrganizing(managedEventId, viewerId);

					const canSeeEmails = viewer !== 'co-organizer';
					for (const tab of ['attendees', 'invites']) {
						const path = `/events/${managedEventId}/admin/${tab}`;
						const response = await page.goto(path);
						await page.waitForLoadState('networkidle');
						expect(response?.status()).toBe(200);
						await expect(page.getByText('Other Organizer', { exact: true })).toBeVisible();
						if (tab === 'attendees')
							await expect(page.getByText('Private Attendee', { exact: true })).toBeVisible();
						const visibleEmails =
							tab === 'attendees' ? [attendeeEmail, organizerEmail] : [organizerEmail];
						for (const email of visibleEmails) {
							await expect(page.getByText(email, { exact: true })).toHaveCount(
								canSeeEmails ? 1 : 0
							);
						}
						const dataResponse = await page.request.get(`${path}/__data.json`);
						const serialized = await dataResponse.text();
						expect(serialized).toContain('Private Attendee');
						expect(serialized).toContain('Other Organizer');
						for (const email of [attendeeEmail, organizerEmail]) {
							if (canSeeEmails) expect(serialized).toContain(email);
							else {
								expect(serialized).not.toContain(email);
								expect(await response!.text()).not.toContain(email);
							}
						}
					}
				} finally {
					if (managedEventId) await deleteTestEvent(managedEventId);
					for (const id of ids) await deleteTestUser(id);
				}
			});
		}
	}
	test.afterAll(closeDb);
});
