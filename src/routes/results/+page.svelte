<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import ResultsPanel from '#lib/components/results/ResultsPanel.svelte';

	const BASE = resolve('/results');

	// Filter state lives in the URL so a search or division can be linked and
	// survives a reload, the same way /rankings carries its tab and series.
	const params = $derived(page.url.searchParams);

	const q = $derived(params.get('q') ?? '');
	const division = $derived(params.get('division') ?? undefined);

	const year = $derived.by(() => {
		const raw = params.get('year');
		if (raw === null) return undefined;
		const parsed = Number(raw);
		return Number.isInteger(parsed) ? parsed : undefined;
	});

	const currentPage = $derived.by(() => {
		const parsed = Number(params.get('page'));
		return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
	});

	function buildHref(overrides: Record<string, string | undefined>): string {
		// SvelteURLSearchParams rather than the built-in: this reads `params`,
		// which is reactive, and the lint rule that enforces it exists to stop
		// exactly that dependency being lost.
		//
		// `.toString()` because SvelteKit 3 made `page.url` immutable on a type
		// level, so `searchParams` is a `ReadonlyURLSearchParams` and is no
		// longer accepted by the constructor. It still reads `params`, so the
		// reactive dependency is unchanged.
		const next = new SvelteURLSearchParams(params.toString());
		for (const [key, value] of Object.entries(overrides)) {
			if (value === undefined || value === '') next.delete(key);
			else next.set(key, value);
		}
		const qs = next.toString();
		return qs ? `${BASE}?${qs}` : BASE;
	}

	// Any filter change resets to page 1 — page 7 of the old result set is
	// almost never page 7 of the new one.
	//
	// `buildHref` starts from `resolve('/results')` and only appends a query
	// string, so the target is already resolved. The filters navigate rather
	// than link because the search box is debounced and the selects are
	// bits-ui, not anchors.
	//
	// `reset: false` is SvelteKit 3's replacement for `noScroll` + `keepFocus`:
	// keep the scroll position and the focused control across the navigation,
	// which is what makes typing in the debounced search box survive.
	const go = (overrides: Record<string, string | undefined>) =>
		goto(buildHref({ ...overrides, page: undefined }), { reset: false });

	const pageHref = (value: number) => buildHref({ page: value === 1 ? undefined : String(value) });
</script>

<svelte:head>
	<title>Results · FPA Events</title>
	<meta
		name="description"
		content="Browse freestyle disc competition results by event, division and year."
	/>
</svelte:head>

<PageShell>
	<PageHeader
		title="Results"
		description="Competition results from the freestyle judging system, back to 1973."
	/>

	<!--
		The panel awaits its data directly rather than sitting behind a
		`<svelte:boundary>`, for the reasons spelled out on /rankings: a `pending`
		snippet defers the whole thing to the client and the rows never reach the
		HTML, and `failed` never fires for an unreachable API because an error
		thrown from a remote function during SSR 500s the request first.
		Unavailability is handled inside the panel instead, as data.
	-->
	<ResultsPanel
		{q}
		{division}
		{year}
		page={currentPage}
		onSearch={(value) => go({ q: value })}
		onDivision={(value) => go({ division: value })}
		onYear={(value) => go({ year: value === undefined ? undefined : String(value) })}
		{pageHref}
	/>
</PageShell>
