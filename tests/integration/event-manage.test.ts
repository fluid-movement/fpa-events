import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { TEST_USER } from './helpers/constants';
import {
	getTestUserId,
	createTestUser,
	deleteTestUser,
	createTestEvent,
	deleteTestEvent,
	setOrganizing,
	clearEventUser,
	getEventName,
	setUserRole,
	eventExists,
	getLocationCoords,
	closeDb
} from './helpers/db';

async function signIn(page: Page, context: BrowserContext) {
	await context.clearCookies();
	const resp = await page.request.post('/api/auth/sign-in/email', {
		data: { email: TEST_USER.email, password: TEST_USER.password }
	});
	expect(resp.ok()).toBeTruthy();
	const state = await page.request.storageState();
	await context.addCookies(state.cookies);
}

test.describe('event manage area', () => {
	let userId: string;
	let ownEventId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
		await setUserRole(userId, 'user');
		ownEventId = await createTestEvent(userId, { name: 'Manage Area Event' });
		await setOrganizing(ownEventId, userId);
	});

	test.afterAll(async () => {
		await deleteTestEvent(ownEventId);
		await closeDb();
	});

	// ─── Tab navigation ────────────────────────────────────────────────────────

	test('defaults to the Details tab without redirecting away from /admin', async ({
		page,
		context
	}) => {
		await signIn(page, context);
		await page.goto(`/events/${ownEventId}/admin`);
		await page.waitForLoadState('networkidle');

		// Details is the index route: /admin must render it directly, never redirect
		// to a /admin/details child.
		await expect(page).toHaveURL(`/events/${ownEventId}/admin`);
		await expect(page.getByTestId('manage-tab-details')).toHaveAttribute('aria-current', 'page');
		await expect(page.getByTestId('event-details-view')).toBeVisible();
	});

	test('selecting a tab puts it in the URL and the back button returns', async ({
		page,
		context
	}) => {
		await signIn(page, context);
		await page.goto(`/events/${ownEventId}/admin`);
		await page.waitForLoadState('networkidle');

		await page.getByTestId('manage-tab-schedule').click();
		await expect(page).toHaveURL(`/events/${ownEventId}/admin/schedule`);
		await expect(page.getByTestId('manage-tab-schedule')).toHaveAttribute('aria-current', 'page');

		await page.getByTestId('manage-tab-invites').click();
		await expect(page).toHaveURL(`/events/${ownEventId}/admin/invites`);

		await page.goBack();
		await expect(page).toHaveURL(`/events/${ownEventId}/admin/schedule`);
		await expect(page.getByTestId('manage-tab-schedule')).toHaveAttribute('aria-current', 'page');
	});

	test('a tab can be deep-linked', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto(`/events/${ownEventId}/admin/attendees`);
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('manage-tab-attendees')).toHaveAttribute('aria-current', 'page');
	});

	test('an unknown tab is a 404, not a silent fallback', async ({ page, context }) => {
		await signIn(page, context);
		const resp = await page.goto(`/events/${ownEventId}/admin/nonsense`);
		expect(resp?.status()).toBe(404);
	});

	// ─── Legacy top-level /events/[id]/edit route (distinct from /admin/edit) ───

	test('the removed /edit URL is gone', async ({ page, context }) => {
		await signIn(page, context);
		const resp = await page.goto(`/events/${ownEventId}/edit`);
		expect(resp?.status()).toBe(404);
	});

	// ─── Details: read-only by default, form behind a button ───────────────────

	test('shows the details as read-only with an Edit details button', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto(`/events/${ownEventId}/admin`);
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('event-details-view')).toBeVisible();
		await expect(page.getByTestId('edit-details')).toBeVisible();
		await expect(page.getByTestId('event-name-input')).not.toBeVisible();
	});

	test('Edit details reveals the form and puts edit in the URL', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto(`/events/${ownEventId}/admin`);
		await page.waitForLoadState('networkidle');

		await page.getByTestId('edit-details').click();
		await expect(page).toHaveURL(`/events/${ownEventId}/admin/edit`);
		await expect(page.getByTestId('event-name-input')).toBeVisible();
		await expect(page.getByTestId('event-details-view')).not.toBeVisible();
	});

	test('Cancel returns to the read-only view without saving', async ({ page, context }) => {
		await signIn(page, context);
		const before = await getEventName(ownEventId);

		await page.goto(`/events/${ownEventId}/admin/edit`);
		await page.waitForLoadState('networkidle');
		await page.getByTestId('event-name-input').fill('Discarded Name');
		await page.getByTestId('cancel-details').click();

		await expect(page).toHaveURL(`/events/${ownEventId}/admin`);
		await expect(page.getByTestId('event-details-view')).toBeVisible();
		expect(await getEventName(ownEventId)).toBe(before);
	});

	test('switching tabs leaves edit mode', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto(`/events/${ownEventId}/admin/edit`);
		await page.waitForLoadState('networkidle');

		await page.getByTestId('manage-tab-schedule').click();
		await expect(page).toHaveURL(`/events/${ownEventId}/admin/schedule`);

		await page.getByTestId('manage-tab-details').click();
		await expect(page).toHaveURL(`/events/${ownEventId}/admin`);
		await expect(page.getByTestId('event-details-view')).toBeVisible();
	});

	test('saving details returns to the read-only view with the new values', async ({
		page,
		context
	}) => {
		await signIn(page, context);
		await page.goto(`/events/${ownEventId}/admin/edit`);
		await page.waitForLoadState('networkidle');

		const newName = `Renamed Event ${Date.now()}`;
		await page.getByTestId('event-name-input').fill(newName);
		await page.getByTestId('save-details').click();
		await page.waitForLoadState('networkidle');

		// Back to the summary, not still sitting in the form
		await expect(page.getByTestId('event-details-view')).toBeVisible();
		await expect(page.getByTestId('event-details-view')).toContainText(newName);

		// Stays inside the manage area rather than bouncing to the public page
		await expect(page).toHaveURL(`/events/${ownEventId}/admin`);

		// Reflected in the manage header, the database, and the public page
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(newName);
		expect(await getEventName(ownEventId)).toBe(newName);

		await page.goto(`/events/${ownEventId}`);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(newName);
	});

	// ─── Locations without a geolocation ───────────────────────────────────────

	test('a location can be added with just a name', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto(`/events/${ownEventId}/admin/schedule`);
		await page.waitForLoadState('networkidle');

		await page.getByRole('button', { name: 'Add Location' }).click();

		// The simple form is the default — no map required
		await expect(page.getByTestId('location-name-input')).toBeVisible();
		await page.getByTestId('location-name-input').fill('Warm-up Field');
		await page.getByTestId('save-location').click();
		await page.waitForLoadState('networkidle');

		await expect(page.getByText('Warm-up Field')).toBeVisible();

		// Persisted with no coordinates rather than 0,0
		await expect
			.poll(() => getLocationCoords(ownEventId, 'Warm-up Field'))
			.toEqual({ latitude: null, longitude: null });
	});

	test('the map picker is opt-in from the location dialog', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto(`/events/${ownEventId}/admin/schedule`);
		await page.waitForLoadState('networkidle');

		await page.getByRole('button', { name: 'Add Location' }).click();
		await expect(page.getByTestId('location-name-input')).toBeVisible();

		await page.getByTestId('use-map-switch').click();
		// The picker replaces the simple form, so `name` fields never collide
		await expect(page.getByTestId('location-name-input')).not.toBeVisible();
		await expect(page.getByLabel('Venue name')).toBeVisible();
	});

	test('a name-only location is selectable on a schedule item', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto(`/events/${ownEventId}/admin/schedule`);
		await page.waitForLoadState('networkidle');

		await page.getByRole('button', { name: 'Add Location' }).click();
		await page.getByTestId('location-name-input').fill('Beach Court');
		await page.getByTestId('save-location').click();
		await page.waitForLoadState('networkidle');

		await page.getByRole('button', { name: 'Add Schedule Item' }).click();
		await expect(page.getByText('Beach Court')).toBeVisible();
	});

	// ─── Status strip ──────────────────────────────────────────────────────────

	test('shows the event status at a glance', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto(`/events/${ownEventId}/admin`);
		await page.waitForLoadState('networkidle');

		// createTestEvent seeds a date a week out
		await expect(page.getByTestId('event-status')).toHaveText('Upcoming');
	});
});

// ─── Type-to-confirm delete ──────────────────────────────────────────────────

test.describe('deleting an event', () => {
	const EVENT_NAME = 'Delete Confirm Event';
	let userId: string;
	let eventId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
		await setUserRole(userId, 'user');
	});

	test.beforeEach(async () => {
		eventId = await createTestEvent(userId, { name: EVENT_NAME });
		await setOrganizing(eventId, userId);
	});

	test.afterEach(async () => {
		await deleteTestEvent(eventId);
	});

	test.afterAll(async () => {
		await closeDb();
	});

	async function openDeleteDialog(page: Page, context: BrowserContext) {
		await signIn(page, context);
		await page.goto(`/events/${eventId}/admin`);
		await page.waitForLoadState('networkidle');
		await page.getByTestId('open-delete-dialog').click();
		await expect(page.getByTestId('delete-dialog')).toBeVisible();
	}

	test('the confirm button is disabled until the exact name is typed', async ({
		page,
		context
	}) => {
		await openDeleteDialog(page, context);

		await expect(page.getByTestId('confirm-delete')).toBeDisabled();

		await page.getByTestId('delete-confirm-input').fill('Delete Confirm');
		await expect(page.getByTestId('confirm-delete')).toBeDisabled();

		await page.getByTestId('delete-confirm-input').fill('delete confirm event');
		await expect(page.getByTestId('confirm-delete')).toBeDisabled();

		await page.getByTestId('delete-confirm-input').fill(EVENT_NAME);
		await expect(page.getByTestId('confirm-delete')).toBeEnabled();

		expect(await eventExists(eventId)).toBe(true);
	});

	test('cancelling does not delete the event', async ({ page, context }) => {
		await openDeleteDialog(page, context);

		// Arm the button first, so cancel is the only thing preventing deletion.
		await page.getByTestId('delete-confirm-input').fill(EVENT_NAME);
		await expect(page.getByTestId('confirm-delete')).toBeEnabled();

		await page.getByTestId('cancel-delete').click();
		await expect(page.getByTestId('delete-dialog')).not.toBeVisible();
		await page.waitForTimeout(500);

		expect(await eventExists(eventId)).toBe(true);
		await expect(page).toHaveURL(`/events/${eventId}/admin`);
	});

	test('the typed name is cleared when the dialog is reopened', async ({ page, context }) => {
		await openDeleteDialog(page, context);
		await page.getByTestId('delete-confirm-input').fill(EVENT_NAME);
		await page.getByTestId('cancel-delete').click();
		await expect(page.getByTestId('delete-dialog')).not.toBeVisible();

		await page.getByTestId('open-delete-dialog').click();
		await expect(page.getByTestId('delete-confirm-input')).toHaveValue('');
		await expect(page.getByTestId('confirm-delete')).toBeDisabled();
	});

	test('typing the exact name and confirming deletes the event', async ({ page, context }) => {
		await openDeleteDialog(page, context);

		await page.getByTestId('delete-confirm-input').fill(EVENT_NAME);
		await page.getByTestId('confirm-delete').click();
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveURL('/events');
		expect(await eventExists(eventId)).toBe(false);
	});

	test('the name to copy is shown in a disabled input', async ({ page, context }) => {
		await openDeleteDialog(page, context);

		const nameField = page.getByLabel('Event name to copy');
		await expect(nameField).toBeDisabled();
		await expect(nameField).toHaveValue(EVENT_NAME);
		await expect(page.getByTestId('copy-event-name')).toBeVisible();
	});
});

// ─── Co-organizer access ─────────────────────────────────────────────────────

test.describe('co-organizer access', () => {
	let userId: string;
	let otherUserId: string;
	let otherEventId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
		await setUserRole(userId, 'user');
		otherUserId = await createTestUser('co-org-owner@playwright.local', 'Co-org Owner');
		otherEventId = await createTestEvent(otherUserId, { name: 'Co-organized Event' });
	});

	test.afterAll(async () => {
		await deleteTestEvent(otherEventId);
		await deleteTestUser(otherUserId);
		await closeDb();
	});

	test.afterEach(async () => {
		await clearEventUser(otherEventId, userId);
	});

	test('without an organizing seat the manage area is closed', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto(`/events/${otherEventId}/admin`);
		await expect(page).toHaveURL(`/events/${otherEventId}`);
	});

	test('an invited co-organizer can open the manage area', async ({ page, context }) => {
		await setOrganizing(otherEventId, userId);
		await signIn(page, context);
		await page.goto(`/events/${otherEventId}/admin`);
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveURL(`/events/${otherEventId}/admin`);
		await expect(page.getByTestId('manage-tab-details')).toBeVisible();
	});

	test('a co-organizer does not get the Danger Zone', async ({ page, context }) => {
		await setOrganizing(otherEventId, userId);
		await signIn(page, context);
		await page.goto(`/events/${otherEventId}/admin`);
		await page.waitForLoadState('networkidle');

		// Deleting the event stays an owner-only action.
		await expect(page.getByRole('heading', { name: 'Delete this event' })).not.toBeVisible();
		await expect(page.getByTestId('open-delete-dialog')).not.toBeVisible();
		await expect(page.getByRole('button', { name: 'Delete Event' })).not.toBeVisible();
	});

	test('the owner does get the Danger Zone', async ({ page, context }) => {
		await setUserRole(userId, 'admin');
		await signIn(page, context);
		await page.goto(`/events/${otherEventId}/admin`);
		await page.waitForLoadState('networkidle');

		await expect(page.getByRole('heading', { name: 'Delete this event' })).toBeVisible();
		await setUserRole(userId, 'user');
	});

	test('a co-organized event appears on /organizing with a badge', async ({ page, context }) => {
		await setOrganizing(otherEventId, userId);
		await signIn(page, context);
		await page.goto('/organizing');
		await page.waitForLoadState('networkidle');

		await expect(page.getByText('Co-organized Event')).toBeVisible();
		await expect(page.getByTestId('co-organizer-badge').first()).toBeVisible();
	});

	test('a co-organizer sees the Manage event button on the public page', async ({
		page,
		context
	}) => {
		await setOrganizing(otherEventId, userId);
		await signIn(page, context);
		await page.goto(`/events/${otherEventId}`);
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('manage-event-link')).toBeVisible();
	});
});
