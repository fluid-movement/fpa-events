<script lang="ts">
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import PageShell from '$lib/components/layout/PageShell.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import SegmentedTabs from '$lib/components/layout/SegmentedTabs.svelte';
	import RankingsPanel from '$lib/components/rankings/RankingsPanel.svelte';
	import RatingsPanel from '$lib/components/rankings/RatingsPanel.svelte';
	import { DEFAULT_MIN_MATCH_COUNT } from '$lib/rankings/types';

	const BASE = resolve('/rankings');

	// View state lives in the URL so a division or tab can be linked and survives
	// a reload. SvelteKit routes these links client-side, so switching does not
	// cost a full page load.
	const params = $derived(page.url.searchParams);
	const tab = $derived(params.get('tab') === 'ratings' ? 'ratings' : 'rankings');
	const series = $derived(params.get('series') ?? undefined);

	const minMatchCount = $derived.by(() => {
		// Check for absence explicitly: Number(null) is 0, which is a valid
		// threshold ("All"), so a missing param would otherwise silently mean
		// "no filter" instead of the default.
		const raw = params.get('minMatches');
		if (raw === null) return DEFAULT_MIN_MATCH_COUNT;

		const parsed = Number(raw);
		return Number.isInteger(parsed) && parsed >= 0 ? parsed : DEFAULT_MIN_MATCH_COUNT;
	});

	function buildHref(overrides: Record<string, string | undefined>): string {
		// SvelteURLSearchParams rather than the built-in: this reads `params`,
		// which is reactive, and the lint rule that enforces it exists to stop
		// exactly that dependency being lost.
		const next = new SvelteURLSearchParams(params);
		for (const [key, value] of Object.entries(overrides)) {
			if (value === undefined) next.delete(key);
			else next.set(key, value);
		}
		const qs = next.toString();
		return qs ? `${BASE}?${qs}` : BASE;
	}

	// Switching tab drops the other tab's parameters, so a stale division does
	// not linger in the URL.
	const rankingsTabHref = $derived(buildHref({ tab: undefined, minMatches: undefined }));
	const ratingsTabHref = $derived(buildHref({ tab: 'ratings', series: undefined }));

	const seriesHref = (value: string) => buildHref({ series: value });
	const thresholdHref = (value: number) => buildHref({ minMatches: String(value) });
</script>

<svelte:head>
	<title>Rankings · FPA Events</title>
	<meta
		name="description"
		content="Freestyle disc world rankings and player ratings, from the community judging system."
	/>
</svelte:head>

<PageShell>
	<PageHeader
		title="Rankings"
		description="World rankings and ratings from the freestyle judging system."
	/>

	<SegmentedTabs
		tabs={[
			{ label: 'Rankings', href: rankingsTabHref, match: ['rankings'], testid: 'tab-rankings' },
			{ label: 'Ratings', href: ratingsTabHref, match: ['ratings'], testid: 'tab-ratings' }
		]}
		current={tab}
		label="Leaderboard"
		fill
		class="mb-6 md:mb-8"
		data-testid="rankings-tabs"
	/>

	<!--
		The panels await their data directly rather than sitting behind a
		`<svelte:boundary>`. Two things ruled the boundary out:

		  - A `pending` snippet makes the boundary defer to the client, so the server
		    ships a skeleton and the standings never appear in the HTML. Blocking on
		    the ~150 ms API call instead server-renders them — better for search
		    engines, and visible without JS.
		  - `failed` never fires for an unreachable API: an error thrown from a
		    remote function during SSR 500s the request before the boundary sees it.
		    Unavailability is handled inside the panels instead, as data.
	-->
	{#if tab === 'ratings'}
		<RatingsPanel {minMatchCount} hrefFor={thresholdHref} />
	{:else}
		<RankingsPanel {series} hrefFor={seriesHref} />
	{/if}
</PageShell>
