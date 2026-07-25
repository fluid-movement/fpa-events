import { test, expect } from '@playwright/test';

/**
 * Rankings page.
 *
 * These assertions are deliberately data-agnostic. The page is server-rendered
 * from fpa-api, and that fetch happens in the SvelteKit server process — so
 * `page.route()` cannot intercept it, and the standings themselves change every
 * time rankings are republished. Asserting behaviour rather than specific
 * players keeps the suite deterministic without standing up a mock upstream.
 *
 * Error handling is covered by the unit tests in
 * `src/lib/server/fpa-api/client.test.ts`, and filtering by
 * `src/lib/components/rankings/RankingsTable.test.ts`.
 */

test.describe('/rankings', () => {
	test('server-renders the standings', async ({ page }) => {
		// Assert against the raw HTML, not the hydrated DOM: the whole point of
		// blocking on the API is that the rows reach the browser in the markup.
		const response = await page.goto('/rankings');
		const html = (await response?.text()) ?? '';

		expect(html).toContain('data-testid="rankings-table"');
		expect(html).not.toContain('data-testid="rankings-unavailable"');
	});

	test('lists ranked players with ranks and points', async ({ page }) => {
		await page.goto('/rankings');
		await page.waitForLoadState('networkidle');

		const rows = page.locator('[data-testid="rankings-table"] tbody tr');
		expect(await rows.count()).toBeGreaterThan(0);

		// The first row is rank 1.
		await expect(rows.first().locator('td').first()).toHaveText('1');
	});

	test('switches division and reflects it in the URL', async ({ page }) => {
		await page.goto('/rankings');
		await page.waitForLoadState('networkidle');

		const women = page.getByTestId('rankings-division-women');
		test.skip(!(await women.isVisible()), 'Only one ranking division is published');

		await women.click();
		// toHaveURL retries; waitForLoadState can resolve before a client-side
		// navigation has settled.
		await expect(page).toHaveURL(/series=ranking-women/);
		await expect(page.getByTestId('rankings-table')).toBeVisible();
	});

	test('expands a row to reveal which events earned the points', async ({ page }) => {
		await page.goto('/rankings');
		await page.waitForLoadState('networkidle');

		const firstToggle = page.locator('[data-testid^="rankings-expand-"]').first();
		const playerId = (await firstToggle.getAttribute('data-testid'))!.replace(
			'rankings-expand-',
			''
		);

		await expect(page.getByTestId(`rankings-breakdown-${playerId}`)).toBeHidden();
		await firstToggle.click();
		await expect(page.getByTestId(`rankings-breakdown-${playerId}`)).toBeVisible();
	});

	test('filters the list live and restores it when cleared', async ({ page }) => {
		await page.goto('/rankings');
		await page.waitForLoadState('networkidle');

		const rows = page.locator('[data-testid="rankings-table"] tbody tr');
		const before = await rows.count();

		// Search for the leader by name, so the fixture is whatever is live.
		const leader = (await rows.first().locator('td').nth(1).textContent())!.trim();
		await page.getByTestId('rankings-search').fill(leader);

		await expect(page.locator('[data-testid="rankings-table"] tbody tr')).toHaveCount(1);

		await page.getByTestId('rankings-search-clear').click();
		await expect(page.locator('[data-testid="rankings-table"] tbody tr')).toHaveCount(before);
	});

	test('shows a no-matches message for a name nobody has', async ({ page }) => {
		await page.goto('/rankings');
		await page.waitForLoadState('networkidle');

		await page.getByTestId('rankings-search').fill('zzzzzzzz');

		await expect(page.getByTestId('rankings-no-matches')).toBeVisible();
		await expect(page.getByTestId('rankings-table')).toBeHidden();
	});

	test('shows ratings with their match counts on the ratings tab', async ({ page }) => {
		await page.goto('/rankings');
		await page.waitForLoadState('networkidle');

		await page.getByTestId('tab-ratings').click();
		await expect(page).toHaveURL(/tab=ratings/);
		await expect(page.getByTestId('ratings-table')).toBeVisible();
		// A rating without its sample size is misleading, so the column is
		// never hidden behind a breakpoint.
		await expect(page.getByRole('columnheader', { name: 'Matches' })).toBeVisible();
	});

	test('defaults the ratings threshold to 50+ rather than All', async ({ page }) => {
		// Regression: `Number(null)` is 0, which is a valid threshold meaning
		// "All", so a missing param silently disabled the default filter.
		await page.goto('/rankings?tab=ratings');
		await page.waitForLoadState('networkidle');

		await expect(page.getByTestId('ratings-threshold-50')).toHaveAttribute('data-slot', 'button');
		const all = page.getByTestId('ratings-threshold-0');
		const fifty = page.getByTestId('ratings-threshold-50');

		// The active threshold is the solid one; compare their classes.
		const allClass = (await all.getAttribute('class')) ?? '';
		const fiftyClass = (await fifty.getAttribute('class')) ?? '';
		expect(fiftyClass).not.toBe(allClass);
		expect(fiftyClass).toContain('bg-primary');
	});

	test('changing the ratings threshold updates the URL and the list', async ({ page }) => {
		await page.goto('/rankings?tab=ratings');
		await page.waitForLoadState('networkidle');

		await page.getByTestId('ratings-threshold-100').click();
		await expect(page).toHaveURL(/minMatches=100/);
		await expect(page.getByTestId('ratings-table')).toBeVisible();
	});
});
