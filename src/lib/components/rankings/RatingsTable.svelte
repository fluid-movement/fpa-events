<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import DataList, { type DataColumn } from '$lib/components/layout/DataList.svelte';
	import EmptyState from '$lib/components/layout/EmptyState.svelte';
	import SearchXIcon from '@lucide/svelte/icons/search-x';
	import PlayerSearch from './PlayerSearch.svelte';
	import { PlayerList, rankTint } from '$lib/rankings/playerList.svelte';
	import type { RatingRow } from '$lib/rankings/types';

	interface Props {
		rows: RatingRow[];
	}

	let { rows }: Props = $props();

	const list = new PlayerList(() => rows);

	// Ratings carry many decimals upstream; a whole number is the useful precision.
	const formatRating = (rating: number) => Math.round(rating).toLocaleString();

	function formatPeakDate(date: string | null): string {
		if (!date) return '';
		const parsed = new Date(date);
		if (Number.isNaN(parsed.getTime())) return '';
		return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
	}

	function peak(row: RatingRow): string {
		if (row.peakRating === null) return '—';
		const when = formatPeakDate(row.peakRatingDate);
		return when ? `${formatRating(row.peakRating)} (${when})` : formatRating(row.peakRating);
	}

	const columns: DataColumn<RatingRow>[] = [
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
			header: 'Rating',
			value: (r) => formatRating(r.rating),
			slot: 'meta',
			numeric: true,
			headerClass: 'w-28'
		},
		// Never behind a breakpoint: a rating without its sample size is misleading.
		{
			header: 'Matches',
			value: (r) => `${r.matchCount.toLocaleString()} matches`,
			slot: 'subtitle',
			numeric: true,
			muted: true,
			headerClass: 'w-28'
		},
		{
			header: 'Peak',
			value: peak,
			slot: 'detail',
			numeric: true,
			muted: true,
			headerClass: 'w-36'
		}
	];
</script>

{#if rows.length === 0}
	<EmptyState
		title="No players meet this match-count threshold"
		description="Try lowering it."
		size="compact"
	/>
{:else}
	<PlayerSearch
		bind:value={list.search}
		resultCount={list.filtered.length}
		testId="ratings-search"
	/>

	{#if list.filtered.length === 0}
		<div data-testid="ratings-no-matches">
			<EmptyState
				icon={SearchXIcon}
				title="No players match “{list.search}”"
				description="Try a shorter search, or check the spelling."
				size="compact"
			/>
		</div>
	{:else}
		<DataList
			rows={list.visible}
			{columns}
			getKey={(r) => r.playerId}
			data-testid="ratings-table"
		/>

		{#if list.hiddenCount > 0 && !list.showAll}
			<div class="mt-4 text-center">
				<Button
					variant="outline"
					data-testid="ratings-show-all"
					onclick={() => (list.showAll = true)}
				>
					Show all {rows.length} players
				</Button>
			</div>
		{/if}
	{/if}
{/if}
