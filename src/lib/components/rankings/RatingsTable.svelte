<script lang="ts">
	import { type DataColumn } from '$lib/components/layout/DataList.svelte';
	import PlayerLeaderboard from './PlayerLeaderboard.svelte';
	import { rankTint } from '$lib/rankings/playerList.svelte';
	import type { RatingRow } from '$lib/rankings/types';

	let { rows }: { rows: RatingRow[] } = $props();

	// Ratings carry many decimals upstream; a whole number is the useful precision.
	const formatRating = (rating: number) => Math.round(rating).toLocaleString();

	/** "1842 (Mar 2025)", or just the number when the date is missing or unparseable. */
	function peak(row: RatingRow): string {
		if (row.peakRating === null) return '—';

		const rating = formatRating(row.peakRating);
		const date = row.peakRatingDate ? new Date(row.peakRatingDate) : null;
		if (!date || Number.isNaN(date.getTime())) return rating;

		return `${rating} (${date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' })})`;
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

<PlayerLeaderboard
	{rows}
	{columns}
	testIdPrefix="ratings"
	emptyTitle="No players meet this match-count threshold"
	emptyDescription="Try lowering it."
/>
