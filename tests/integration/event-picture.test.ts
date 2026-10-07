import { test, expect } from '@playwright/test';
import {
	getTestUserId,
	createTestUser,
	deleteTestUser,
	createTestEvent,
	deleteTestEvent,
	setOrganizing,
	setEventPicture,
	getEventPicture,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';
import { postOverriding } from './helpers/forms';

installErrorGuard(test);

/**
 * The picture URL travels in a hidden field of the event form. An organizer who
 * could store another event's URL would, on replacing it, make the server delete
 * that event's image from the bucket.
 */
test.describe('event pictures', () => {
	const OWN_NAME = 'Picture Spec Own Event';
	const THEIR_PICTURE = 'https://pictures.example.com/events/theirs.jpg';
	let ownEventId: string;
	let otherUserId: string;
	let otherEventId: string;

	test.beforeEach(async () => {
		const userId = await getTestUserId(TEST_USER.email);
		ownEventId = await createTestEvent(userId, { name: OWN_NAME });
		await setOrganizing(ownEventId, userId);

		otherUserId = await createTestUser(`picture-${Date.now()}@playwright.local`, 'Other Organizer');
		otherEventId = await createTestEvent(otherUserId, { name: 'Picture Spec Other Event' });
		await setEventPicture(otherEventId, THEIR_PICTURE);
	});

	test.afterEach(async () => {
		await deleteTestEvent(ownEventId);
		await deleteTestEvent(otherEventId);
		await deleteTestUser(otherUserId);
	});

	test.afterAll(async () => {
		await closeDb();
	});

	test("an event cannot take over another event's picture", async ({ page }) => {
		expectConsoleErrors(page);
		await page.goto(`/events/${ownEventId}/admin/edit`);
		await page.waitForLoadState('networkidle');
		await postOverriding(page, 'updateEvent', OWN_NAME, { picture: THEIR_PICTURE });

		expect(await getEventPicture(ownEventId)).toBeNull();
		expect(await getEventPicture(otherEventId)).toBe(THEIR_PICTURE);
	});

	test('the upload endpoint refuses SVG', async ({ page }) => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
		const res = await page.request.post('/api/events/upload-image', {
			multipart: { file: { name: 'x.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) } }
		});

		expect(res.status()).toBe(400);
	});
});
