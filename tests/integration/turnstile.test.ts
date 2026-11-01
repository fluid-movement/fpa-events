import { test, expect, type Page } from '@playwright/test';
import { getEventIdByName, deleteEventsByName, closeDb } from './helpers/db';
import { installErrorGuard } from './helpers/console';
import { pickEventDateRange } from './helpers/forms';

installErrorGuard(test);

/**
 * These specs run against the second dev server (port 5175, project `turnstile`),
 * which loads the real Cloudflare widget with Cloudflare's always-passing test
 * keys. Everywhere else the keys are blank and the widget never renders — which is
 * how the widget's injected `cf-turnstile-response` input reached production
 * unnoticed: Kit 3 rejects any form field not built by `fields.as(...)` and the
 * submit died in the browser with `form_field_unbound`.
 */

const EVENT_NAME = 'Playwright Turnstile Event';
const RENAMED = 'Playwright Turnstile Event Renamed';

/**
 * The widget solves itself with the test keys; submitting before it does sends no token.
 * It talks to Cloudflare, so give it far longer than the 5 s default: a slow answer
 * from the network must not fail the pre-push gate.
 */
async function waitForTurnstileToken(page: Page): Promise<void> {
	await expect
		.poll(
			() =>
				page.evaluate(
					() =>
						[...document.querySelectorAll<HTMLInputElement>('input[type="hidden"]')].find((i) =>
							i.name.startsWith('turnstileToken')
						)?.value ?? ''
				),
			{ timeout: 30_000 }
		)
		.not.toBe('');
}

/**
 * Not `openCreateEventPage`: the widget keeps polling Cloudflare, so the page never
 * reaches `networkidle`. A solved widget proves hydration instead — it mounts in
 * `onMount`, and the token only arrives after that.
 */
async function openCreatePage(page: Page): Promise<void> {
	await page.goto('/events/create');
	await waitForTurnstileToken(page);
	await expect(page.getByText('Select a date range')).toBeVisible();
}

test.describe('forms behind a live Turnstile widget', () => {
	// Two widget solves per test, each a round trip to Cloudflare.
	test.describe.configure({ timeout: 90_000 });

	test.beforeEach(async () => {
		await deleteEventsByName(EVENT_NAME);
		await deleteEventsByName(RENAMED);
	});

	test.afterAll(async () => {
		await deleteEventsByName(EVENT_NAME);
		await deleteEventsByName(RENAMED);
		await closeDb();
	});

	test('the widget adds no field of its own to the form', async ({ page }) => {
		await openCreatePage(page);
		await expect(page.locator('form [name="cf-turnstile-response"]')).toHaveCount(0);
	});

	test('creates and then edits an event', async ({ page }) => {
		await openCreatePage(page);
		await page.getByLabel('Event name').fill(EVENT_NAME);
		await pickEventDateRange(page);
		await waitForTurnstileToken(page);
		await page.getByRole('button', { name: 'Create event' }).click();
		await expect(page).toHaveURL(/\/events\/[^/]+\/admin$/);

		const eventId = await getEventIdByName(EVENT_NAME);
		expect(eventId).toBeTruthy();

		await page.goto(`/events/${eventId}/admin/edit`);
		await waitForTurnstileToken(page);
		await page.getByTestId('event-name-input').fill(RENAMED);
		await page.getByTestId('save-details').click();

		await expect(page.getByTestId('event-details-view')).toContainText(RENAMED);
	});
});
