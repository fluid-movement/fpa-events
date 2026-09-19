<script lang="ts">
	import { resolve } from '$app/paths';
	import { SvelteSet } from 'svelte/reactivity';
	import { Button } from '$lib/components/ui/button';
	import { type DataColumn } from '$lib/components/layout/DataList.svelte';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import PlayerLeaderboard from './PlayerLeaderboard.svelte';
	import RankingBreakdown from './RankingBreakdown.svelte';
	import { rankTint } from '$lib/rankings/playerList.svelte';
	import { formatPoints } from '$lib/utils/numbers';
	import type { RankingRow } from '$lib/rankings/types';

	let {
		rows,
		/** Passed through so an expanded row can look its player up in this series. */
		series
	}: { rows: RankingRow[]; series: string } = $props();

	// SvelteSet is reactive on mutation, so rows can be toggled in place.
	const expandedIds = new SvelteSet<string>();

	function toggle(playerId: string) {
		if (expandedIds.has(playerId)) expandedIds.delete(playerId);
		else expandedIds.add(playerId);
	}

	const columns: DataColumn<RankingRow>[] = [
		{
			header: '#',
			value: (r) => r.rank,
			slot: 'lead',
			numeric: true,
			cellClass: (r) => `font-semibold ${rankTint(r.rank)}`,
			headerClass: 'w-16'
		},
		{
			header: 'Player',
			value: (r) => r.fullName,
			slot: 'primary',
			href: (r) => resolve(`/players/${r.playerId}`)
		},
		{
			header: 'Points',
			value: (r) => formatPoints(r.points),
			slot: 'meta',
			numeric: true,
			headerClass: 'w-28'
		},
		{
			header: 'Events',
			value: (r) => r.resultsCount,
			slot: 'detail',
			numeric: true,
			muted: true,
			headerClass: 'w-24'
		}
	];
</script>

<PlayerLeaderboard
	{rows}
	{columns}
	testIdPrefix="rankings"
	emptyTitle="No ranked players in this division yet"
	isExpanded={(r) => expandedIds.has(r.playerId)}
>
	{#snippet trailing(row)}
		{#if row.resultsCount > 0}
			{@const isOpen = expandedIds.has(row.playerId)}
			<Button
				variant="ghost"
				size="icon-sm"
				aria-expanded={isOpen}
				aria-label="{isOpen ? 'Hide' : 'Show'} scoring events for {row.fullName}"
				data-testid="rankings-expand-{row.playerId}"
				onclick={() => toggle(row.playerId)}
			>
				<ChevronDownIcon class="transition-transform {isOpen ? 'rotate-180' : ''}" />
			</Button>
		{/if}
	{/snippet}

	{#snippet expanded(row)}
		<!-- Fetched on expand, not shipped with the table — see
		     `getScoringResults`. Keyed on the player so a reopened row does not
		     reuse the previous one's request. -->
		{#key row.playerId}
			<RankingBreakdown playerId={row.playerId} fullName={row.fullName} {series} />
		{/key}
	{/snippet}
</PlayerLeaderboard>
