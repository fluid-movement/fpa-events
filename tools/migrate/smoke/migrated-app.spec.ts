import { test, expect, type Page } from '@playwright/test';

// This is a post-migration smoke check, never part of tests/integration.
test.skip(
	process.env.MIGRATION_SMOKE !== '1',
	'Set MIGRATION_SMOKE=1 to run against a migrated app'
);

function required(name: string): string {
	const value = process.env[`MIGRATION_SMOKE_${name}`];
	if (!value) throw new Error(`MIGRATION_SMOKE_${name} is required`);
	return value;
}

function eventPath(name: string): string {
	const id = required(name);
	if (!/^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/.test(id))
		throw new Error(`Invalid ${name} ULID`);
	return `/events/${id}`;
}

async function open(page: Page, path: string) {
	const response = await page.goto(path);
	expect(response?.status()).toBe(200);
	await page.waitForLoadState('networkidle');
}

test('migrated bcrypt sign-in, pictures, schedules, RSVPs, map and calendar feed', async ({
	page,
	context
}) => {
	const picturePath = eventPath('PICTURE_EVENT_ID');
	const schedulePath = eventPath('SCHEDULE_EVENT_ID');
	const rsvpPath = eventPath('RSVP_EVENT_ID');
	const mapPath = eventPath('MAP_EVENT_ID');
	const runtimeErrors: string[] = [];
	page.on('pageerror', (error) => runtimeErrors.push(error.message));
	page.on('console', (message) => {
		// Tiles are external best-effort decoration. App errors must fail the smoke.
		if (message.type() === 'error' && !message.location().url.includes('tile.openstreetmap.org')) {
			runtimeErrors.push(message.text());
		}
	});
	await context.clearCookies();
	await open(page, '/sign-in');
	await page.getByLabel('Email', { exact: true }).fill(required('EMAIL'));
	await page.getByLabel('Password', { exact: true }).fill(required('PASSWORD'));
	await page.getByRole('button', { name: 'Sign in', exact: true }).click();
	await page.waitForURL('**/dashboard');
	await page.waitForLoadState('networkidle');
	// A protected page after reloading proves the migrated credential created a session.
	await open(page, '/attending');
	await expect(page.getByRole('heading', { name: 'Attending', exact: true })).toBeVisible();
	await expect(page.locator(`main a[href="${rsvpPath}"]`).first()).toBeVisible();

	await open(page, picturePath);
	const eventName = (await page.locator('main h1').innerText()).trim();
	const picture = page.getByRole('img', { name: eventName, exact: true });
	await expect(picture).toBeVisible();
	await expect
		.poll(() =>
			picture.evaluate(
				(img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0
			)
		)
		.toBe(true);

	await open(page, schedulePath);
	await page.getByRole('tab', { name: 'Schedule', exact: true }).click();
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('tabpanel')).toContainText(required('SCHEDULE_ITEM_NAME'));

	// Read the existing RSVP; the suite never toggles it or edits legacy rows.
	await open(page, rsvpPath);
	await expect(page.getByTestId('rsvp-sign-in-link')).toHaveCount(0);
	const rsvpName = (await page.locator('main h1').innerText()).trim();
	await open(page, '/attending');
	await expect(page.locator(`main a[href="${rsvpPath}"]`).first()).toContainText(rsvpName);
	const field = page.getByTestId('calendar-feed-url');
	await expect(field).toHaveValue(/\/api\/calendar\/[^/]+\/feed\.ics$/);
	const feedURL = new URL(await field.inputValue());
	expect(feedURL.origin).toBe(new URL(page.url()).origin);
	const feed = await page.request.get(feedURL.href);
	expect(feed.status()).toBe(200);
	expect(feed.headers()['content-type']).toContain('text/calendar');
	const ics = (await feed.text()).replace(/\r?\n[ \t]/g, '');
	expect(ics).toContain('BEGIN:VCALENDAR');
	expect(ics).toContain('BEGIN:VEVENT');
	expect(ics).toContain(`UID:${required('RSVP_EVENT_ID')}`);

	await open(page, '/');
	const map = page.locator('main .leaflet-container');
	await expect(map).toBeVisible();
	const markers = map.locator('.leaflet-marker-icon');
	await expect.poll(() => markers.count()).toBeGreaterThan(0);
	let found = false;
	for (let i = 0; i < (await markers.count()); i++) {
		await markers.nth(i).click();
		await page.waitForLoadState('networkidle');
		const link = map.locator(`.leaflet-popup a[href="${mapPath}"]`);
		if (await link.count()) {
			await expect(link).toBeVisible();
			found = true;
			break;
		}
	}
	expect(found, 'expected the selected upcoming migrated event in a map popup').toBe(true);
	expect(runtimeErrors, 'browser errors during migrated-app smoke').toEqual([]);
});
