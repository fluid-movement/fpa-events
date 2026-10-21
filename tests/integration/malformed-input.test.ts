import { test, expect, type APIResponse } from '@playwright/test';
import { expectConsoleErrors, installErrorGuard } from './helpers/console';

installErrorGuard(test);

/**
 * A remote function answers an error as a JSON body (Kit sends HTTP 200 and
 * puts the status inside); an expected one carries no error reference.
 */
async function expectRemoteStatus(response: APIResponse, status: number) {
	expect(response.status()).toBeLessThan(500);
	const body = await response.json();
	expect(body).toMatchObject({ type: 'error', error: { status } });
	expect(body.error).not.toHaveProperty('errorId');
}

for (const path of [
	'/events/%00',
	'/events/%00/admin/schedule',
	'/invite/%00',
	'/api/calendar/%00/feed.ics',
	'/events/past/99999',
	'/events/past/1e20',
	'/events/not-a-stored-id',
	'/api/calendar/not-a-token/feed.ics'
]) {
	test(`anonymous malformed path is a client error: ${path}`, async ({ page, context }) => {
		expectConsoleErrors(page);
		await context.clearCookies();
		const response = await page.goto(path);
		await page.waitForLoadState('networkidle');
		expect(response?.status()).toBeGreaterThanOrEqual(400);
		expect(response?.status()).toBeLessThan(500);
		expect(await response?.text()).not.toContain('errorId');
	});
}

// Load the actual client module to obtain the current Kit hash. A fake hash
// would only test a missing endpoint and could pass with the decoder still broken.
test('malformed remote payloads are 400 on a live query endpoint', async ({ page, context }) => {
	expectConsoleErrors(page);
	await context.clearCookies();
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	const source = await page.request.get('/src/lib/api/players.remote.ts');
	expect(source.ok()).toBe(true);
	const hash = (await source.text()).match(/query\(["']([^"']+)\/getPlayerProfile["']/)?.[1];
	expect(hash, 'current Kit remote query ID').toBeTruthy();
	const endpoint = `/_app/remote/${hash}/getPlayerProfile`;
	// A well-encoded argument with the wrong schema proves this is a live query.
	const wrongType = Buffer.from('[42]').toString('base64url');
	await expectRemoteStatus(await page.request.get(`${endpoint}?payload=${wrongType}`), 400);
	for (const payload of [
		'AAAA',
		'%',
		Buffer.from('not JSON').toString('base64url'),
		Buffer.from('[{"x":999}]').toString('base64url'),
		Buffer.from('["bad\\u0000id"]').toString('base64url')
	]) {
		const response = await page.request.get(`${endpoint}?payload=${encodeURIComponent(payload)}`);
		await expectRemoteStatus(response, 400);
	}
});

for (const [modulePath, name] of [
	['/src/routes/events/[id]/admin/event-details.remote.ts', 'getEvent'],
	['/src/routes/events/[id]/admin/schedule/locations.remote.ts', 'listEventLocations']
]) {
	test(`anonymous manager query ${name} is 401`, async ({ page, context }) => {
		expectConsoleErrors(page);
		await context.clearCookies();
		const source = await page.request.get(modulePath);
		expect(source.ok()).toBe(true);
		const hash = (await source.text()).match(new RegExp(`query\\(["']([^"']+)/${name}["']`))?.[1];
		expect(hash, 'live remote query ID').toBeTruthy();
		const payload = Buffer.from('["01m5a4te7kpbqedtvncyxkx1gn"]').toString('base64url');
		const response = await page.request.get(`/_app/remote/${hash}/${name}?payload=${payload}`);
		await expectRemoteStatus(response, 401);
	});
}
