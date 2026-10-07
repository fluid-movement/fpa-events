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

/**
 * Post the `remote` function's form that currently holds `holding` straight to
 * its action, with the named fields overridden — what a hand-crafted request
 * does. Editing hidden inputs in the DOM is not enough: Kit submits from its own
 * field state. `accept: text/html` makes it the no-JS submission Kit expects from
 * a plain POST; without it Kit answers 405.
 */
export async function postOverriding(
	page: Page,
	remote: string,
	holding: string,
	overrides: Record<string, string>
): Promise<void> {
	const found = await page.evaluate(
		async ([remote, holding, overrides]) => {
			// Matched on the remote function too: an item's edit and delete forms
			// both hold its id, and picking the wrong one deletes instead of edits.
			const form = [...document.querySelectorAll('form')].find(
				(f) =>
					decodeURIComponent(f.action).endsWith(`/${remote}`) &&
					[...new FormData(f).values()].includes(holding)
			);
			if (!form) return false;
			const body = new FormData(form);
			for (const key of [...body.keys()]) {
				// Kit names fields `<key>/<form id>`.
				const field = key.split('/')[0];
				if (field in overrides) body.set(key, overrides[field]);
			}
			await fetch(form.action, {
				method: 'POST',
				body,
				redirect: 'manual',
				headers: { accept: 'text/html' }
			});
			return true;
		},
		[remote, holding, overrides] as const
	);
	expect(found, `no ${remote} form on the page holds ${holding}`).toBe(true);
}
