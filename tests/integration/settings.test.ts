import { test, expect } from '@playwright/test';
import {
	getTestUserId,
	createTestEvent,
	eventExists,
	getUserName,
	getSessionIds,
	deleteEventsByName,
	sql,
	closeDb
} from './helpers/db';
import { TEST_USER } from './helpers/constants';
import { expectSessionAccess, signUpAndSignIn, signIn } from './helpers/auth';
import { installErrorGuard, expectConsoleErrors } from './helpers/console';

installErrorGuard(test);

test.describe('settings — profile', () => {
	test.afterAll(async () => {
		// Leave the shared identity as the rest of the suite expects to find it.
		await sql()`UPDATE "user" SET name = ${TEST_USER.name} WHERE email = ${TEST_USER.email}`;
		await closeDb();
	});

	test('updates the display name', async ({ page }) => {
		const newName = `Renamed ${Date.now()}`;

		await page.goto('/settings/profile');
		await page.getByLabel('Name').fill(newName);
		// The only classic `actions` handler left in the app: a native form POST
		// with a full page reload, so there is no remote call to wait on.
		await page.getByRole('button', { name: 'Save changes' }).click();

		await expect(page.getByText('Profile updated.')).toBeVisible();
		// What actually matters: it persisted.
		await expect.poll(() => getUserName(TEST_USER.email)).toBe(newName);

		// Asserted after a reload rather than in place. `load` reads
		// `locals.user`, which hooks.server.ts populated at the start of the same
		// request the action then handled — so the field still shows the old name
		// until the page is fetched again.
		await page.reload();
		await expect(page.getByLabel('Name')).toHaveValue(newName);
	});

	test('email is shown but not editable', async ({ page }) => {
		await page.goto('/settings/profile');
		await expect(page.getByLabel('Email')).toBeDisabled();
		await expect(page.getByLabel('Email')).toHaveValue(TEST_USER.email);
	});
});

test.describe('settings — password', () => {
	// Serial: each test leaves the password in the state the next one assumes.
	test.describe.configure({ mode: 'serial' });

	const email = 'password-spec@playwright.local';
	const original = 'password-spec-original-1';
	const changed = 'password-spec-changed-1';

	test.afterAll(async () => {
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
		await closeDb();
	});

	test('rejects a mismatched confirmation without calling the server', async ({
		page,
		context
	}) => {
		await signUpAndSignIn(page, context, { email, password: original });
		await page.goto('/settings/password');
		// The form is client-only: submitting before hydration does a native GET
		// and the handler never runs. Same wait the rest of the suite uses.
		await page.waitForLoadState('networkidle');

		await page.locator('#current').fill(original);
		await page.locator('#new').fill(changed);
		await page.locator('#confirm').fill('something-else');
		await page.getByRole('button', { name: 'Change password' }).click();

		await expect(page.getByText('New passwords do not match.')).toBeVisible();
	});

	test('changes the password, revokes old cookies and rotates the initiating session', async ({
		page,
		context
	}) => {
		expectConsoleErrors(page);
		await signIn(page, context, { email, password: original });
		const otherCookies = await context.cookies();
		await expectSessionAccess(page, context, otherCookies, true);
		await signIn(page, context, { email, password: original });
		const initiatingCookies = await context.cookies();
		await expectSessionAccess(page, context, initiatingCookies, true);
		await expect.poll(async () => (await getSessionIds(email)).length).toBeGreaterThanOrEqual(2);
		const previousIds = await getSessionIds(email);

		await page.getByLabel('Current password', { exact: true }).fill(original);
		await page.getByLabel('New password', { exact: true }).fill(changed);
		await page.getByLabel('Confirm new password', { exact: true }).fill(changed);
		await page.getByRole('button', { name: 'Change password' }).click();
		await page.waitForLoadState('networkidle');
		await expect(page.getByText('Password updated.')).toBeVisible();

		const replacementCookies = await context.cookies();
		await expect.poll(() => getSessionIds(email)).toHaveLength(1);
		await expect
			.poll(async () => (await getSessionIds(email)).filter((id) => previousIds.includes(id)))
			.toEqual([]);
		await expectSessionAccess(page, context, replacementCookies, true);
		await expectSessionAccess(page, context, otherCookies, false);
		await expectSessionAccess(page, context, initiatingCookies, false);

		await context.clearCookies();
		const rejected = await page.request.post('/api/auth/sign-in/email', {
			data: { email, password: original }
		});
		expect(rejected.status()).toBe(401);
		await signIn(page, context, { email, password: changed });
		await expectSessionAccess(page, context, await context.cookies(), true);
	});

	test('a wrong current password changes neither credential nor sessions', async ({
		page,
		context
	}) => {
		expectConsoleErrors(page);
		await signIn(page, context, { email, password: changed });
		const otherCookies = await context.cookies();
		await expectSessionAccess(page, context, otherCookies, true);
		const beforeSecondSignIn = await getSessionIds(email);
		await signIn(page, context, { email, password: changed });
		const initiatingCookies = await context.cookies();
		await expectSessionAccess(page, context, initiatingCookies, true);
		await expect.poll(() => getSessionIds(email)).toHaveLength(beforeSecondSignIn.length + 1);
		const previousIds = await getSessionIds(email);
		const credential = () => sql()<{ password: string }[]>`
			SELECT a.password FROM account a JOIN "user" u ON u.id = a.user_id
			WHERE u.email = ${email} AND a.provider_id = 'credential'
		`;
		const previousCredential = await credential();
		expect(previousCredential).toHaveLength(1);

		await page.getByLabel('Current password', { exact: true }).fill('not-the-current-password');
		await page.getByLabel('New password', { exact: true }).fill('another-new-password-1');
		await page.getByLabel('Confirm new password', { exact: true }).fill('another-new-password-1');
		await page.getByRole('button', { name: 'Change password' }).click();
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('alert')).toBeVisible();

		await expect.poll(credential).toEqual(previousCredential);
		await expect.poll(() => getSessionIds(email)).toEqual(previousIds);
		await expectSessionAccess(page, context, otherCookies, true);
		await expectSessionAccess(page, context, initiatingCookies, true);
		await context.clearCookies();
		const rejected = await page.request.post('/api/auth/sign-in/email', {
			data: { email, password: 'another-new-password-1' }
		});
		expect(rejected.status()).toBe(401);
		await signIn(page, context, { email, password: changed });
		await expectSessionAccess(page, context, await context.cookies(), true);
	});
});

test.describe('settings — account deletion', () => {
	const email = 'delete-me@playwright.local';
	const password = 'delete-me-password-1';
	const OWNED_EVENT = 'Event Owned By Deleted User';

	test.afterAll(async () => {
		await deleteEventsByName(OWNED_EVENT);
		await sql()`DELETE FROM "user" WHERE email = ${email}`;
		await closeDb();
	});

	test('deletes the user and the events they created', async ({ page, context }) => {
		await signUpAndSignIn(page, context, { email, password });

		// `events.userId` has no FK cascade, so deleteAccount removes events by
		// hand. That manual step is the part worth pinning down.
		const [row] = await sql()<[{ id: string }]>`
			SELECT id FROM "user" WHERE email = ${email} LIMIT 1
		`;
		const eventId = await createTestEvent(row.id, { name: OWNED_EVENT });
		expect(await eventExists(eventId)).toBe(true);

		await page.goto('/settings/account');
		// The dialog is opened by an onclick handler, so the page has to hydrate
		// before the click does anything.
		await page.waitForLoadState('networkidle');
		await page.getByTestId('open-delete-account').click();
		await expect(page.getByTestId('delete-account-dialog')).toBeVisible();
		await page.getByTestId('delete-account-password').fill(password);
		await page.getByTestId('confirm-delete-account').click();
		await page.waitForLoadState('networkidle');

		await expect.poll(() => eventExists(eventId)).toBe(false);
		await expect
			.poll(async () => (await sql()`SELECT id FROM "user" WHERE email = ${email}`).length)
			.toBe(0);
	});

	test('a wrong password deletes nothing and shows an error', async ({ page, context }) => {
		await signUpAndSignIn(page, context, { email, password });

		await page.goto('/settings/account');
		await page.waitForLoadState('networkidle');
		await page.getByTestId('open-delete-account').click();
		await page.getByTestId('delete-account-password').fill('not-the-password-1');
		await page.getByTestId('confirm-delete-account').click();
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('delete-account-error')).toHaveText('Incorrect password.');
		await expect(page).toHaveURL(/settings\/account/);
		const rows = await sql()`SELECT id FROM "user" WHERE email = ${email}`;
		expect(rows.length).toBe(1);
	});

	test('the confirm dialog can be dismissed without deleting', async ({ page, context }) => {
		await signUpAndSignIn(page, context, { email, password });

		await page.goto('/settings/account');
		// The dialog is opened by an onclick handler, so the page has to hydrate
		// before the click does anything.
		await page.waitForLoadState('networkidle');
		await page.getByTestId('open-delete-account').click();
		await expect(page.getByTestId('delete-account-dialog')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByTestId('delete-account-dialog')).not.toBeVisible();

		await page.reload();
		await expect(page).not.toHaveURL(/sign-in/);
	});

	test('redirects an anonymous visitor to sign-in', async ({ page, context }) => {
		await context.clearCookies();
		await page.goto('/settings/account');
		await expect(page).toHaveURL(/\/sign-in/);
	});
});

test.describe('settings — guards', () => {
	test.afterAll(async () => {
		await closeDb();
	});

	test('/settings redirects to the profile tab', async ({ page }) => {
		await getTestUserId(TEST_USER.email);
		await page.goto('/settings');
		await expect(page).toHaveURL(/\/settings\/profile/);
	});
});
