import { test, expect } from '@playwright/test';
import { installErrorGuard } from './helpers/console';

installErrorGuard(test);

/**
 * Results browser.
 *
 * Data-agnostic for the same reason as `rankings.test.ts`: these pages are
 * server-rendered from fpa-api, that fetch happens in the SvelteKit server
 * process where `page.route()` cannot reach it, and the catalogue grows every
 * time results are published. So the assertions are about behaviour — the
 * filters narrow, the links lead somewhere real — not about specific events.
 *
 * The filtering logic itself is unit-tested in
 * `src/lib/server/fpa-api/eventIndex.test.ts`, and the placings rules in
 * `src/lib/components/results/DivisionResults.test.ts`.
 */

const rows = '[data-testid^="results-row-"]';

test.describe('/results', () => {
	test('server-renders the event list', async ({ page }) => {
		// Assert against the raw HTML, not the hydrated DOM: the point of blocking
		// on the API is that the rows reach the browser in the markup.
		const response = await page.goto('/results');
		const html = (await response?.text()) ?? '';

		expect(html).toContain('data-testid="results-list"');
		expect(html).not.toContain('data-testid="results-unavailable"');
	});

	test('pages through a list longer than one page', async ({ page }) => {
		await page.goto('/results');
		await page.waitForLoadState('networkidle');

		const first = await page.locator(rows).first().getAttribute('data-testid');
		expect(await page.locator(rows).count()).toBeGreaterThan(0);

		await page.getByTestId('results-pagination-next').click();
		await expect(page).toHaveURL(/page=2/);

		await expect(page.locator(rows).first()).not.toHaveAttribute('data-testid', first!);
		await expect(page.getByTestId('results-pagination-summary')).toContainText('51–');
	});

	test('search narrows the list and is carried in the URL', async ({ page }) => {
		await page.goto('/results');
		await page.waitForLoadState('networkidle');

		const before = await page.locator(rows).count();

		// Search for a word from the first event's own name, so the fixture is
		// whatever is live rather than a hard-coded event.
		const leadName = (await page.locator(rows).first().locator('p').first().textContent())!.trim();
		const word = leadName.split(/\s+/).find((w) => w.length > 3) ?? leadName;

		await page.getByTestId('results-search').fill(word);
		// The search is debounced, so wait for the URL rather than a timeout.
		await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(word)}`, 'i'));
		await page.waitForLoadState('networkidle');

		expect(await page.locator(rows).count()).toBeLessThanOrEqual(before);
		await expect(page.locator(rows).first()).toBeVisible();
	});

	test('a search nobody matches shows the no-matches notice', async ({ page }) => {
		await page.goto('/results?q=zzzzzzzz');
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('results-no-matches')).toBeVisible();
		await expect(page.getByTestId('results-pagination-summary')).toContainText('No events');
	});

	test('a year filter survives a reload and only shows that year', async ({ page }) => {
		// 2020 on purpose: those events include a `2020-2-8` date that the API's
		// own from/to filter drops, because it compares dates as strings.
		await page.goto('/results?year=2020');
		await page.waitForLoadState('networkidle');

		const count = await page.locator(rows).count();
		expect(count).toBeGreaterThan(0);

		for (const row of await page.locator(rows).all()) {
			await expect(row).toContainText('2020');
		}

		await page.reload();
		await page.waitForLoadState('networkidle');
		expect(await page.locator(rows).count()).toBe(count);
	});

	test('filtering by division resets to the first page', async ({ page }) => {
		await page.goto('/results?page=3');
		await page.waitForLoadState('networkidle');

		await page.getByTestId('results-division').click();
		await page.getByRole('option', { name: 'Open Pairs', exact: true }).click();

		await expect(page).toHaveURL(/division=Open\+Pairs/);
		await expect(page).not.toHaveURL(/page=/);
	});
});

test.describe('/results/[eventId]', () => {
	test('opens an event and renders its placings', async ({ page }) => {
		await page.goto('/results');
		await page.waitForLoadState('networkidle');

		await page.locator(rows).first().click();

		await expect(page).toHaveURL(/\/results\/[0-9a-f-]{36}/);
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('division-results')).toBeVisible();
		// Round 1 is the final, and every division that has results has one.
		await expect(page.getByTestId('round-1')).toBeVisible();
	});

	test('switches division through the URL', async ({ page }) => {
		await page.goto('/results');
		await page.waitForLoadState('networkidle');
		await page.locator(rows).first().click();
		await page.waitForLoadState('networkidle');

		// Wait for the placings before counting tabs: probing visibility straight
		// after the click can run before the division panel has rendered, and the
		// test would skip itself rather than fail.
		await expect(page.getByTestId('division-results')).toBeVisible();

		const tabs = page.getByTestId('event-division-tabs');
		const tabCount = await tabs.locator('a').count();
		test.skip(tabCount < 2, 'This event has only one division');

		const second = tabs.locator('a').nth(1);
		const label = (await second.textContent())!.trim();
		await second.click();

		await expect(page).toHaveURL(new RegExp(`division=${encodeURIComponent(label)}`, 'i'));
		await expect(page.getByTestId('division-results')).toBeVisible();
	});
});

test.describe('/players/[playerId]', () => {
	test('reaches a profile from a result and shows its career', async ({ page }) => {
		await page.goto('/results');
		await page.waitForLoadState('networkidle');
		await page.locator(rows).first().click();
		await page.waitForLoadState('networkidle');

		await page.locator('[data-testid^="placing-player-"]').first().click();

		await expect(page).toHaveURL(/\/players\/[0-9a-f-]{36}/);
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('player-stats')).toBeVisible();
		// Anyone reachable from a placing has at least that placing on record.
		await expect(page.getByTestId('player-career')).toBeVisible();
	});
});
