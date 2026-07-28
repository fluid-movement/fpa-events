<script lang="ts">
	import SegmentedTabs from '$lib/components/layout/SegmentedTabs.svelte';
	import RatingsTable from './RatingsTable.svelte';
	import RankingsUnavailable from './RankingsUnavailable.svelte';
	import { getRatings } from '../../../routes/rankings/data.remote';

	interface Props {
		minMatchCount: number;
		hrefFor: (minMatchCount: number) => string;
	}

	let { minMatchCount, hrefFor }: Props = $props();

	const standings = $derived(await getRatings({ minMatchCount }));

	/**
	 * Of 2265 rated players most have only a handful of matches behind their
	 * number, so the threshold is the difference between a meaningful
	 * leaderboard and noise.
	 */
	const THRESHOLDS = [
		{ value: 0, label: 'All' },
		{ value: 10, label: '10+' },
		{ value: 50, label: '50+' },
		{ value: 100, label: '100+' }
	];
</script>

{#if !standings.ok}
	<RankingsUnavailable message={standings.message} />
{:else}
	<div class="mb-6 space-y-4">
		<!-- Rankings and ratings disagree (the points leader is 5th by rating).
		     Without this note that reads as a bug rather than two measures. -->
		<p class="text-sm text-muted-foreground">
			Ratings estimate a player's current strength from head-to-head results, like a chess Elo. They
			are a different measure from ranking points, which accumulate over a season — so the two
			leaderboards will not agree. A rating backed by few matches is not very meaningful.
		</p>

		<div class="flex flex-wrap items-center gap-2">
			<span class="text-sm font-medium">Minimum matches</span>
			<SegmentedTabs
				tabs={THRESHOLDS.map((threshold) => ({
					label: threshold.label,
					href: hrefFor(threshold.value),
					match: [String(threshold.value)],
					testid: `ratings-threshold-${threshold.value}`
				}))}
				current={String(minMatchCount)}
				label="Minimum matches"
				data-testid="ratings-threshold"
			/>
			<!-- The API caps a response at 500 rows, and every threshold under
			     100+ matches more players than that. Say so rather than
			     reporting the truncated count as the total. -->
			<span class="text-sm text-muted-foreground">
				{#if standings.data.total > standings.data.rows.length}
					Top {standings.data.rows.length} of {standings.data.total} players
				{:else}
					{standings.data.total} player{standings.data.total === 1 ? '' : 's'}
				{/if}
			</span>
		</div>
	</div>

	<RatingsTable rows={standings.data.rows} />
{/if}
