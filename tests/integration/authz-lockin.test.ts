import { test, expect, type Page } from '@playwright/test';
import {
	closeDb,
	createMagicLink,
	createTestEvent,
	createTestUser,
	deleteEventsByName,
	deleteTestEvent,
	deleteTestUser,
	getEventIdByName,
	getEventName,
	getTestUserId,
	setOrganizing,
	sql
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';
import {
	callRemoteForm,
	captureRemoteForm,
	openCreateEventPage,
	pickEventDateRange
} from './helpers/forms';

installErrorGuard(test);

/**
 * A signed-in user who manages one event drives the manager remote functions at
 * an event they do not manage. The real, rendered form is captured on their own
 * event and replayed with the target swapped, so a refusal means the guard said
 * no — not that the payload was malformed. Each test then replays the same
 * payload at their own event as a control.
 */
test.describe('a non-manager cannot write to another event', () => {
	let userId: string;
	let ownEventId: string;
	let otherUserId: string;
	let otherEventId: string;

	test.beforeEach(async () => {
		userId = await getTestUserId(TEST_USER.email);
		ownEventId = await createTestEvent(userId, { name: 'Lockin Own Event' });
		await setOrganizing(ownEventId, userId);
		otherUserId = await createTestUser(`lockin-${crypto.randomUUID()}@playwright.local`);
		otherEventId = await createTestEvent(otherUserId, { name: 'Lockin Other Event' });
	});

	test.afterEach(async () => {
		await deleteTestEvent(ownEventId);
		await deleteTestEvent(otherEventId);
		await deleteTestUser(otherUserId);
	});

	test.afterAll(closeDb);

	async function open(page: Page, path: string) {
		await page.goto(`/events/${ownEventId}/admin/${path}`);
		await page.waitForLoadState('networkidle');
	}

	/** The same form, posted as if it had been rendered on the other event's page. */
	function retarget(form: Awaited<ReturnType<typeof captureRemoteForm>>) {
		return { ...form, action: form.action.replace(ownEventId, otherEventId) };
	}

	test('updateEvent, whose target comes from the request path, leaves it unchanged', async ({
		page
	}) => {
		expectConsoleErrors(page);
		await open(page, 'edit');
		const form = await captureRemoteForm(page, 'updateEvent');
		const result = await callRemoteForm(page, retarget(form), { name: 'Hijacked' });
		expect(result).toMatchObject({ type: 'error', error: { status: 403 } });
		await expect.poll(() => getEventName(otherEventId)).toBe('Lockin Other Event');

		// Control: the same payload is accepted for the event the user manages.
		const renamed = await callRemoteForm(page, form, { name: 'Lockin Renamed' });
		expect(renamed.data).toContain(`/events/${ownEventId}/admin`);
		await expect.poll(() => getEventName(ownEventId)).toBe('Lockin Renamed');
	});

	test("regenerateLink leaves another event's invite link intact", async ({ page }) => {
		expectConsoleErrors(page);
		const theirLink = await createMagicLink(otherEventId);
		const ownLink = await createMagicLink(ownEventId);
		await open(page, 'invites');
		const form = await captureRemoteForm(page, 'regenerateLink');
		const result = await callRemoteForm(page, form, { eventId: otherEventId });
		expect(result).toMatchObject({ type: 'error', error: { status: 403 } });
		const linksOf = async (id: string) =>
			(await sql()`SELECT id FROM event_magic_links WHERE event_id = ${id}`).map((r) => r.id);
		await expect.poll(() => linksOf(otherEventId)).toEqual([theirLink]);

		// Control: the manager's own link is replaced by the same payload.
		expect((await callRemoteForm(page, form)).type).toBe('result');
		await expect.poll(async () => (await linksOf(ownEventId)).includes(ownLink)).toBe(false);
	});

	test('createEventLocation adds no venue to another event', async ({ page }) => {
		expectConsoleErrors(page);
		await open(page, 'schedule');
		await page.getByRole('button', { name: 'Add Location' }).click();
		await page.getByTestId('location-name-input').fill('Injected Venue');
		const form = await captureRemoteForm(page, 'createEventLocation');
		const venuesOf = async (id: string) =>
			(await sql()`SELECT name FROM schedule_locations WHERE event_id = ${id}`).map((r) => r.name);

		const result = await callRemoteForm(page, form, { eventId: otherEventId });
		expect(result).toMatchObject({ type: 'error', error: { status: 403 } });
		await expect.poll(() => venuesOf(otherEventId)).toEqual([]);

		// Control: the manager's own event takes the same payload.
		expect((await callRemoteForm(page, form)).type).toBe('result');
		await expect.poll(() => venuesOf(ownEventId)).toEqual(['Injected Venue']);
	});
});

test.describe('anonymous callers', () => {
	const NAME = 'Lockin Anonymous Create';

	test.beforeEach(() => deleteEventsByName(NAME));
	test.afterAll(async () => {
		await deleteEventsByName(NAME);
		await closeDb();
	});

	test('a direct createEvent submit creates no event', async ({ page, context }) => {
		expectConsoleErrors(page);
		await openCreateEventPage(page);
		await page.getByLabel('Event name').fill(NAME);
		await pickEventDateRange(page);
		const form = await captureRemoteForm(page, 'createEvent');
		await context.clearCookies();

		const result = await callRemoteForm(page, form);
		// Kit reports a redirect from a form as a result whose data holds the location.
		expect(result.type).toBe('result');
		expect(result.data).toContain('/sign-in');
		// The redirect is the guard; the poll proves nothing slipped in after it.
		await expect.poll(() => getEventIdByName(NAME)).toBeNull();
	});

	test('the upload endpoint is 401 without a session', async ({ page, context }) => {
		expectConsoleErrors(page);
		await context.clearCookies();
		const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
		const res = await page.request.post('/api/events/upload-image', {
			multipart: { file: { name: 'x.png', mimeType: 'image/png', buffer: png } }
		});
		expect(res.status()).toBe(401);
		expect(await res.json()).toEqual({ error: 'Unauthorized' });
	});
});
