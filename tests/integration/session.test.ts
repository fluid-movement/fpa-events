import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { TEST_USER } from './helpers/constants';
import { installErrorGuard, watchForErrors } from './helpers/console';
import {
	getTestUserId,
	createTestEvent,
	deleteTestEvent,
	setOrganizing,
	closeDb
} from './helpers/db';

/**
 * Whole-app canaries.
 *
 * The sidebar's auth block is rendered from `client.useSession()`, so the server
 * always ships the signed-out branch and only the client can correct it. That
 * makes it a single check for three things at once: hydration ran, the client
 * bundle is healthy, and `/api/auth/*` is reachable on whatever origin the app
 * is being served from.
 *
 * Both of these exist because a whole redesign shipped with the suite green
 * while the app was visibly broken in a browser — every assertion looked at
 * URLs and attributes, and nothing looked at the console or the auth state.
 */

// Covers the two canaries below, which had no error watching of their own. The
// third test builds its own watcher so it can assert per route and name the
// route that broke; the two overlap harmlessly on that one.
installErrorGuard(test);

async function signIn(page: Page, context: BrowserContext) {
	await context.clearCookies();
	const resp = await page.request.post('/api/auth/sign-in/email', {
		data: { email: TEST_USER.email, password: TEST_USER.password }
	});
	expect(resp.ok()).toBeTruthy();
	await context.addCookies((await page.request.storageState()).cookies);
}

test.describe('session and hydration canaries', () => {
	let userId: string;
	let eventId: string;

	test.beforeAll(async () => {
		userId = await getTestUserId(TEST_USER.email);
		eventId = await createTestEvent(userId, { name: 'Canary Event' });
		await setOrganizing(eventId, userId);
	});

	test.afterAll(async () => {
		await deleteTestEvent(eventId);
		await closeDb();
	});

	test('the auth endpoint is reachable on the serving origin', async ({ page }) => {
		// Regression: with BETTER_AUTH_URL pinned to one port, running the dev
		// server on any other port makes better-auth stop handling /api/auth/*,
		// which 404s here and silently signs the UI out.
		const resp = await page.request.get('/api/auth/get-session');
		expect(resp.status(), 'get-session must be handled on the origin the app is served from').toBe(
			200
		);
	});

	test('the sidebar reflects the signed-in user after hydration', async ({ page, context }) => {
		await signIn(page, context);
		await page.goto('/events');
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('sidebar-auth')).toHaveAttribute('data-state', 'signed-in');
	});

	test('no runtime errors on a fresh load of any page type', async ({ page, context }) => {
		await signIn(page, context);
		const watcher = watchForErrors(page);

		const routes = [
			'/',
			'/events',
			`/events/${eventId}`,
			'/events/create',
			'/rankings',
			'/rankings?tab=ratings',
			'/organizing',
			'/attending',
			'/dashboard',
			'/settings/profile',
			'/settings/privacy',
			'/settings/account',
			`/events/${eventId}/admin`,
			`/events/${eventId}/admin/edit`,
			`/events/${eventId}/admin/attendees`,
			`/events/${eventId}/admin/schedule`,
			`/events/${eventId}/admin/invites`
		];

		for (const route of routes) {
			// A fresh goto each time: this is the hydration path, and the one a
			// client-side tab click never exercises.
			await page.goto(route);
			await page.waitForLoadState('networkidle');
			watcher.assertClean(route);
		}

		watcher.stop();
	});
});
