import { test, expect } from '@playwright/test';
import { deleteUserByEmail, getUserImage, getUserName, userExists, closeDb } from './helpers/db';
import { signUpAndSignIn } from './helpers/auth';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';

installErrorGuard(test);

/**
 * Better Auth's own endpoints accept `name` and `image` as any value, and the
 * profile form's validation only covers the app's wrapper. These requests go
 * straight to /api/auth/..., as a hostile client would.
 */
test.describe('Better Auth user input', () => {
	const email = 'user-input-spec@playwright.local';
	const password = 'user-input-spec-pw-1';

	test.beforeEach(async () => {
		await deleteUserByEmail(email);
	});

	test.afterAll(async () => {
		await deleteUserByEmail(email);
		await closeDb();
	});

	test('sign-up drops an image and refuses a bad name', async ({ page, context }) => {
		await context.clearCookies();
		const withImage = await page.request.post('/api/auth/sign-up/email', {
			data: { email, password, name: 'Image Spec', image: 'https://tracker.example/p.gif' }
		});
		expect(withImage.ok()).toBe(true);
		await expect.poll(() => userExists(email)).toBe(true);
		expect(await getUserImage(email)).toBeNull();

		await deleteUserByEmail(email);
		for (const name of ['a\u0000b', 'a\r\nb', 'x'.repeat(101), '   ', 42]) {
			const res = await page.request.post('/api/auth/sign-up/email', {
				data: { email, password, name }
			});
			expect(res.status(), `name ${JSON.stringify(name)}`).toBe(400);
			expect(await userExists(email)).toBe(false);
		}
	});

	test('update-user refuses a bad name and never stores an image', async ({
		page,
		context,
		baseURL
	}) => {
		await signUpAndSignIn(page, context, { email, password, name: 'Update Spec' });
		expectConsoleErrors(page);
		const update = (data: Record<string, unknown>) =>
			page.request.post('/api/auth/update-user', {
				data,
				// Better Auth's CSRF check refuses a cookie-bearing POST without an Origin.
				headers: { origin: new URL(page.url() === 'about:blank' ? baseURL! : page.url()).origin }
			});

		for (const name of ['a\u0000b', 'a\r\nDESCRIPTION:x', 'x'.repeat(101), '', 42, { a: 1 }]) {
			const res = await update({ name });
			// 400 from our hook, not the 403/422 of some other layer.
			expect(res.status(), `name ${JSON.stringify(name)}: ${await res.text()}`).toBe(400);
		}
		expect(await getUserName(email)).toBe('Update Spec');

		const ok = await update({ name: '  Renamed Spec ', image: 'https://tracker.example/p.gif' });
		expect(ok.ok(), `${ok.status()} ${await ok.text()}`).toBe(true);
		await expect.poll(() => getUserName(email)).toBe('Renamed Spec');
		expect(await getUserImage(email)).toBeNull();

		const dataUri = await update({ image: `data:image/png;base64,${'A'.repeat(10_000)}` });
		expect(dataUri.status(), await dataUri.text()).toBeLessThan(500);
		expect(await getUserImage(email)).toBeNull();
	});
});
