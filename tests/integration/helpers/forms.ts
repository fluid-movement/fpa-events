import { expect, type Page } from '@playwright/test';

/**
 * Helpers for the create-event form.
 *
 * Both of these exist because the form's inputs are Svelte-managed: the
 * `startDate`/`endDate` fields are hidden inputs whose value is derived from
 * calendar state. Assigning to `input.value` from `page.evaluate` appears to
 * work and then silently loses the value on the next re-render, which surfaces
 * much later as a submit that never navigates. Drive the real controls instead.
 */

/** Navigates and waits for hydration — clicks before it are silently dropped. */
export async function openCreateEventPage(page: Page): Promise<void> {
	await page.goto('/events/create');
	await page.waitForLoadState('networkidle');
	await expect(page.getByText('Select a date range')).toBeVisible();
}

/**
 * Picks a start and end day in the month after the current one.
 *
 * Next month rather than this one because the event must be in the future: a
 * past event hides the setup checklist and swaps the RSVP controls, so tests
 * asserting on those need dates that are still ahead no matter what day the
 * suite runs on. Days are addressed by `data-value` rather than their label,
 * which avoids matching "1" against "17".
 */
export async function pickEventDateRange(page: Page): Promise<{ start: string; end: string }> {
	const now = new Date();
	const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	const ym = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
	const start = `${ym}-15`;
	const end = `${ym}-17`;

	// The NextButton renders a single "›" glyph.
	await page.locator('button:has-text("›")').first().click();

	await page.locator(`[data-value="${start}"]`).first().click();
	await page.locator(`[data-value="${end}"]`).first().click();

	// Proves the hidden date inputs are populated. Without this the submit fails
	// in a way that looks like a hydration flake.
	await expect(page.getByText('Select a date range')).toHaveCount(0);
	return { start, end };
}
