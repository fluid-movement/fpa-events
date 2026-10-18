import { test, expect } from '@playwright/test';
import { signUpAndSignIn } from './helpers/auth';
import {
	closeDb,
	createTestEvent,
	createTestUser,
	deleteTestEvent,
	deleteTestUser,
	eventExists,
	getEventPicture,
	getTestUserId,
	setEventPicture,
	setOrganizing,
	sql
} from './helpers/db';
import { installErrorGuard } from './helpers/console';

installErrorGuard(test);

test('account deletion removes pictured events with co-organizers and preserves another owner’s event', async ({
	page,
	context
}) => {
	const email = `delete-pictures-${Date.now()}@playwright.local`;
	const password = 'delete-pictures-password-1';
	const eventIds: string[] = [];
	const userIds: string[] = [];

	try {
		await signUpAndSignIn(page, context, { email, password });
		const ownerId = await getTestUserId(email);
		userIds.push(ownerId);
		await sql()`INSERT INTO verification (id, identifier, value, expires_at)
			VALUES (${`delete-pictures-${ownerId}`}, ${email}, 'test-token', NOW() + INTERVAL '1 hour')`;
		const otherId = await createTestUser(`picture-coorganizer-${Date.now()}@playwright.local`);
		userIds.push(otherId);

		const solo = await createTestEvent(ownerId);
		eventIds.push(solo);
		const coorganized = await createTestEvent(ownerId);
		eventIds.push(coorganized);
		const shared = await createTestEvent(ownerId);
		eventIds.push(shared);
		const surviving = await createTestEvent(otherId);
		eventIds.push(surviving);

		// Two owned events share a picture; another shares with a surviving event.
		const ownedPicture = '/fpa-logo-dark.png';
		const sharedPicture = '/fpa-logo-light.png';
		await setEventPicture(solo, ownedPicture);
		await setEventPicture(coorganized, ownedPicture);
		await setOrganizing(coorganized, otherId);
		await setEventPicture(shared, sharedPicture);
		await setEventPicture(surviving, sharedPicture);

		await page.goto('/settings/account');
		await page.waitForLoadState('networkidle');
		await page.getByTestId('open-delete-account').click();
		await page.getByTestId('delete-account-password').fill(password);
		await page.getByTestId('confirm-delete-account').click();
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveURL('/');
		await expect(page.getByTestId('delete-account-error')).toHaveCount(0);
		for (const id of [solo, coorganized, shared]) {
			await expect.poll(() => eventExists(id)).toBe(false);
		}
		await expect
			.poll(async () => (await sql()`SELECT id FROM "user" WHERE id = ${ownerId}`).length)
			.toBe(0);
		await expect
			.poll(
				async () => (await sql()`SELECT id FROM verification WHERE identifier = ${email}`).length
			)
			.toBe(0);
		await expect.poll(() => eventExists(surviving)).toBe(true);
		await expect.poll(() => getEventPicture(surviving)).toBe(sharedPicture);
		await expect
			.poll(async () => (await sql()`SELECT id FROM "user" WHERE id = ${otherId}`).length)
			.toBe(1);
		// Blank R2 credentials mean this test cannot observe the bucket. Picture
		// release and preservation are covered by unit tests mocking deleteImage.
	} finally {
		await sql()`DELETE FROM verification WHERE identifier = ${email}`;
		for (const id of eventIds) await deleteTestEvent(id);
		for (const id of userIds) await deleteTestUser(id);
		await closeDb();
	}
});
