<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { Button } from '$lib/components/ui/button';
	import { type DataColumn } from '$lib/components/layout/DataList.svelte';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import PlayerLeaderboard from './PlayerLeaderboard.svelte';
	import { rankTint } from '$lib/rankings/playerList.svelte';
	import type { RankingRow } from '$lib/rankings/types';

	let { rows }: { rows: RankingRow[] } = $props();

	// SvelteSet is reactive on mutation, so rows can be toggled in place.
	const expandedIds = new SvelteSet<string>();

	function toggle(playerId: string) {
		if (expandedIds.has(playerId)) expandedIds.delete(playerId);
		else expandedIds.add(playerId);
	}

	// Points can carry a decimal (e.g. 203.8) but are usually whole.
	const formatPoints = (points: number) =>
		Number.isInteger(points) ? String(points) : points.toFixed(1);

	const columns: DataColumn<RankingRow>[] = [
		{
			header: '#',
			value: (r) => r.rank,
			slot: 'lead',
			numeric: true,
			cellClass: (r) => `font-semibold ${rankTint(r.rank)}`,
			headerClass: 'w-16'
		},
		{ header: 'Player', value: (r) => r.fullName, slot: 'primary' },
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
		{#if row.breakdown.length > 0}
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
		<p class="mb-2 text-xs font-medium text-muted-foreground">
			Top scoring events
			{#if row.resultsCount > row.breakdown.length}
				<span class="font-normal">({row.breakdown.length} of {row.resultsCount})</span>
			{/if}
		</p>
		<ul class="space-y-1" data-testid="rankings-breakdown-{row.playerId}">
			{#each row.breakdown as entry, i (i)}
				<li class="flex items-baseline justify-between gap-4">
					<span class="truncate">
						{entry.eventName}
						<span class="text-muted-foreground">· {entry.division}</span>
					</span>
					<span class="shrink-0 tabular-nums">{formatPoints(entry.points)}</span>
				</li>
			{/each}
		</ul>
	{/snippet}
</PlayerLeaderboard>
