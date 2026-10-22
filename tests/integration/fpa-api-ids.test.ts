import { test, expect, type Page } from '@playwright/test';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';

installErrorGuard(test);

/**
 * The fpa-api remote queries take an id from the browser straight into an
 * upstream path. `.` and `..` survive encodeURIComponent and would be resolved
 * as dot segments, so each query must reject them before any fetch. The real
 * request URL (with its per-file hash) is captured from the page, then replayed
 * with the id swapped.
 */

const b64 = (text: string) => Buffer.from(text).toString('base64url');
const unb64 = (text: string) => Buffer.from(text, 'base64url').toString();

async function replayWithId(page: Page, requestUrl: string, id: string) {
	const url = new URL(requestUrl);
	const payload = unb64(url.searchParams.get('payload')!);
	// devalue: a string argument is `["<id>"]`, an object has the id as a string
	// element — in both cases the one UUID is the only string that looks like one.
	const swapped = payload.replace(/"[0-9a-f]{8}-[0-9a-f-]{27}"/i, JSON.stringify(id));
	expect(swapped).not.toBe(payload);
	url.searchParams.set('payload', b64(swapped));
	// Kit answers a rejected argument with HTTP 200 and an error envelope.
	return (await page.request.get(url.toString())).json() as Promise<{
		type: string;
		error?: { status: number };
	}>;
}

const captured = (page: Page, name: string) =>
	page.waitForRequest((r) => r.url().includes(`/${name}?`));

test.describe('fpa-api id arguments', () => {
	test('getScoringResults rejects dot segments and accepts the real id', async ({ page }) => {
		expectConsoleErrors(page);
		await page.goto('/rankings');
		await page.waitForLoadState('networkidle');

		const request = captured(page, 'getScoringResults');
		await page.locator('[data-testid^="rankings-expand-"]').first().click();
		const url = (await request).url();

		for (const id of ['.', '..']) {
			expect(await replayWithId(page, url, id)).toMatchObject({
				type: 'error',
				error: { status: 400 }
			});
		}
		expect(await replayWithId(page, url, '88a7c11c-fcce-402e-b3f4-b5d84acb27af')).toMatchObject({
			type: 'result'
		});
	});

	test('getEventResults and getPlayerProfile reject dot segments', async ({ page }) => {
		expectConsoleErrors(page);
		await page.goto('/rankings');
		await page.waitForLoadState('networkidle');

		await page.locator('[data-testid^="rankings-expand-"]').first().click();
		const eventRequest = captured(page, 'getEventResults');
		await page.locator('[data-testid^="rankings-breakdown-event-"]').first().click();
		const eventUrl = (await eventRequest).url();
		await page.waitForLoadState('networkidle');

		const profileRequest = captured(page, 'getPlayerProfile');
		await page.locator('a[href^="/players/"]').first().click();
		const profileUrl = (await profileRequest).url();

		for (const url of [eventUrl, profileUrl]) {
			for (const id of ['.', '..']) {
				expect(await replayWithId(page, url, id)).toMatchObject({
					type: 'error',
					error: { status: 400 }
				});
			}
		}
	});
});
