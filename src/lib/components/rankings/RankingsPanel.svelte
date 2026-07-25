<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import RankingsTable from './RankingsTable.svelte';
	import RankingsUnavailable from './RankingsUnavailable.svelte';
	import { getSeries, getRankings } from '../../../routes/rankings/data.remote';

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
		<div
			class="mb-6 flex w-full gap-2 rounded-lg border bg-muted/40 p-1.5"
			data-testid="rankings-division-switcher"
		>
			{#each available.data.rankings as option (option.series)}
				<Button
					class="flex-1"
					variant={option.series === standings.data.series ? 'default' : 'ghost'}
					href={hrefFor(option.series)}
					data-testid="rankings-division-{option.division}"
				>
					{divisionLabel(option.division)}
					<span class="ml-1.5 text-xs opacity-70">{option.playerCount}</span>
				</Button>
			{/each}
		</div>
	{/if}

	<RankingsTable rows={standings.data.rows} />
{/if}
