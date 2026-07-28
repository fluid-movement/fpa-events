import { test as base, type Page } from '@playwright/test';

/**
 * Fails a test on any uncaught exception or `console.error` from the page.
 *
 * Added after a session where the suite stayed green while the app was visibly
 * broken in the browser: every assertion checked URLs, text and attributes, so
 * a page could throw on load and nothing noticed.
 */

/** Console noise that is expected and not a defect. */
const IGNORED = [
	// Tests that deliberately request a missing route log the transport failure.
	/Failed to load resource: the server responded with a status of 40[34]/i,
	// Leaflet tile fetches are best-effort in a sandboxed test run.
	/tile\.openstreetmap|Failed to load resource.*\.png/i
];

export type ErrorWatcher = {
	/** Everything collected so far, deduped. */
	messages: () => string[];
	/** Throws if anything was collected. */
	assertClean: (context?: string) => void;
	/** Drop what's been collected — use between navigations in a long test. */
	reset: () => void;
	stop: () => void;
};

export function watchForErrors(page: Page): ErrorWatcher {
	let collected: string[] = [];

	const onPageError = (err: Error) => {
		collected.push(`uncaught: ${err.message}`);
	};

	const onConsole = (msg: { type(): string; text(): string }) => {
		if (msg.type() !== 'error') return;
		const text = msg.text();
		if (IGNORED.some((re) => re.test(text))) return;
		collected.push(`console.error: ${text}`);
	};

	page.on('pageerror', onPageError);
	page.on('console', onConsole);

	return {
		messages: () => [...new Set(collected)],
		reset: () => {
			collected = [];
		},
		stop: () => {
			page.off('pageerror', onPageError);
			page.off('console', onConsole);
		},
		assertClean(context = '') {
			const unique = [...new Set(collected)];
			if (unique.length === 0) return;
			throw new Error(
				`Runtime errors on the page${context ? ` (${context})` : ''}:\n  ` + unique.join('\n  ')
			);
		}
	};
}

/**
 * Pages whose test has declared that it causes console errors on purpose.
 * A WeakSet so a finished test's page cannot keep anything alive.
 */
const exempt = new WeakSet<Page>();

/**
 * Opt this test out of the spec-wide guard.
 *
 * For tests that deliberately drive a request to a non-2xx response — a wrong
 * password, a rejected form — where the browser logs the transport failure even
 * though the app handled it correctly. Preferred over widening `IGNORED`, which
 * would blind every other test in the suite to the same status code.
 */
export function expectConsoleErrors(page: Page): void {
	exempt.add(page);
}

/**
 * Call once at the top of a spec file to fail every test in it on a runtime
 * error. One line per spec beats repeating before/after hooks.
 */
export function installErrorGuard(test: typeof base) {
	const watchers = new Map<Page, ErrorWatcher>();

	test.beforeEach(({ page }) => {
		watchers.set(page, watchForErrors(page));
	});

	test.afterEach(({ page }) => {
		const watcher = watchers.get(page);
		watchers.delete(page);
		try {
			if (!exempt.has(page)) watcher?.assertClean();
		} finally {
			watcher?.stop();
		}
	});
}
