<script lang="ts">
	import SegmentedTabs from '$lib/components/layout/SegmentedTabs.svelte';
	import RankingsTable from './RankingsTable.svelte';
	import RankingsUnavailable from './RankingsUnavailable.svelte';
	import { getSeries, getRankings } from '$lib/api/rankings.remote';

	interface Props {
		/** Series from the URL. Validated server-side; falls back to the default. */
		series?: string;
		/** Builds a link that switches division while preserving the tab. */
		hrefFor: (series: string) => string;
	}

	let { series, hrefFor }: Props = $props();

	const available = $derived(await getSeries());
	const standings = $derived(await getRankings(series));

	// 'ranking-open' -> 'Open'
	const divisionLabel = (division: string) => division.charAt(0).toUpperCase() + division.slice(1);
</script>

{#if !standings.ok}
	<RankingsUnavailable message={standings.message} />
{:else}
	<!-- The switcher is driven by the API's own series list, so a new division
	     appears without a code change. Skipped if that call failed but the
	     standings succeeded. -->
	{#if available.ok && available.data.rankings.length > 1}
		<SegmentedTabs
			tabs={available.data.rankings.map((option) => ({
				label: divisionLabel(option.division),
				href: hrefFor(option.series),
				match: [option.series],
				count: option.playerCount,
				testid: `rankings-division-${option.division}`
			}))}
			current={standings.data.series}
			label="Division"
			fill
			class="mb-6"
			data-testid="rankings-division-switcher"
		/>
	{/if}

	<RankingsTable rows={standings.data.rows} />
{/if}
