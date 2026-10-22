import { test, expect } from '@playwright/test';
import {
	closeDb,
	createTestEvent,
	createTestUser,
	deleteTestEvent,
	deleteTestUser,
	getTestUserId,
	insertScheduleItem,
	setOrganizing
} from './helpers/db';
import { TEST_USER } from './helpers/constants';

// API requests deliberately skip both layouts; a normal navigation would hide the bug.
let eventId: string;
let ownerId: string;
let signedInId: string;
const ITEM = 'Leaf-only schedule access marker';

test.beforeEach(async () => {
	signedInId = await getTestUserId(TEST_USER.email);
	ownerId = await createTestUser(`schedule-access-${crypto.randomUUID()}@playwright.local`);
	eventId = await createTestEvent(ownerId);
	await insertScheduleItem(eventId, ITEM, 'Private manage load');
});

test.afterEach(async () => {
	await deleteTestEvent(eventId);
	await deleteTestUser(ownerId);
});
test.afterAll(closeDb);

function leafUrl(id: string) {
	return `/events/${id}/admin/schedule/__data.json?x-sveltekit-invalidated=001`;
}

test('anonymous leaf-only requests redirect without schedule data', async ({ page, context }) => {
	await context.clearCookies();
	const response = await page.request.get(leafUrl(eventId));
	const body = await response.text();
	const data = JSON.parse(body);
	expect(data.type).toBe('redirect');
	expect(new URL(data.location, response.url()).href).toBe(
		new URL('/sign-in', response.url()).href
	);
	expect(body).not.toContain(ITEM);
});

test('signed-in non-managers receive a forbidden leaf without schedule data', async ({ page }) => {
	const response = await page.request.get(leafUrl(eventId));
	const body = await response.text();
	const data = JSON.parse(body);
	expect(data.nodes.slice(0, 2)).toEqual([{ type: 'skip' }, { type: 'skip' }]);
	expect(data.nodes[2]).toMatchObject({ type: 'error', error: { status: 403 } });
	expect(body).not.toContain(ITEM);
});

test('an accepted co-organizer still receives the leaf data', async ({ page }) => {
	await setOrganizing(eventId, signedInId);
	const response = await page.request.get(leafUrl(eventId));
	const body = await response.text();
	expect(JSON.parse(body).nodes[2].type).toBe('data');
	expect(body).toContain(ITEM);
});

test('the owner still receives the leaf data', async ({ page }) => {
	const ownedId = await createTestEvent(signedInId);
	try {
		await insertScheduleItem(ownedId, ITEM, '');
		const response = await page.request.get(leafUrl(ownedId));
		const body = await response.text();
		expect(JSON.parse(body).nodes[2].type).toBe('data');
		expect(body).toContain(ITEM);
	} finally {
		await deleteTestEvent(ownedId);
	}
});
