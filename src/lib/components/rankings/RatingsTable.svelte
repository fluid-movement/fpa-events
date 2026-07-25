<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import PlayerSearch from './PlayerSearch.svelte';
	import type { RatingRow } from '$lib/rankings/types';

	interface Props {
		rows: RatingRow[];
	}

	let { rows }: Props = $props();

	const INITIAL_ROWS = 100;

	let showAll = $state(false);
	let search = $state('');

	// Filtering happens client-side: the rows are already loaded, so there is no
	// request per keystroke.
	const filtered = $derived.by(() => {
		const needle = search.trim().toLowerCase();
		if (!needle) return rows;
		return rows.filter((row) => row.fullName.toLowerCase().includes(needle));
	});

	// While searching, show every match — a name far down the list is exactly
	// what someone is searching for.
	const visible = $derived(showAll || search.trim() ? filtered : filtered.slice(0, INITIAL_ROWS));
	const hiddenCount = $derived(search.trim() ? 0 : Math.max(0, filtered.length - INITIAL_ROWS));

	// Ratings carry many decimals upstream; a whole number is the useful precision.
	const formatRating = (rating: number) => Math.round(rating).toLocaleString();

	function formatPeakDate(date: string | null): string {
		if (!date) return '';
		const parsed = new Date(date);
		if (Number.isNaN(parsed.getTime())) return '';
		return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
	}

	function rankClass(rank: number): string {
		if (rank === 1) return 'text-amber-500';
		if (rank === 2) return 'text-slate-400';
		if (rank === 3) return 'text-amber-700';
		return 'text-muted-foreground';
	}
</script>

{#if rows.length === 0}
	<p class="py-8 text-center text-muted-foreground">
		No players meet this match-count threshold. Try lowering it.
	</p>
{:else}
	<PlayerSearch bind:value={search} resultCount={filtered.length} testId="ratings-search" />

	{#if filtered.length === 0}
		<p class="py-8 text-center text-muted-foreground" data-testid="ratings-no-matches">
			No players match “{search}”.
		</p>
	{:else}
		<div class="overflow-hidden rounded-lg border">
			<table class="w-full text-sm" data-testid="ratings-table">
				<thead class="bg-muted/50">
					<tr>
						<th class="w-16 px-4 py-3 text-right font-medium">#</th>
						<th class="px-4 py-3 text-left font-medium">Player</th>
						<th class="w-28 px-4 py-3 text-right font-medium">Rating</th>
						<!-- Match count is shown always, never behind a breakpoint: a rating
						     without its sample size is misleading. -->
						<th class="w-28 px-4 py-3 text-right font-medium">Matches</th>
						<th class="hidden w-36 px-4 py-3 text-right font-medium md:table-cell">Peak</th>
					</tr>
				</thead>
				<tbody>
					{#each visible as row (row.playerId)}
						<tr class="border-t">
							<td class="px-4 py-3 text-right font-semibold tabular-nums {rankClass(row.rank)}">
								{row.rank}
							</td>
							<td class="px-4 py-3 font-medium">{row.fullName}</td>
							<td class="px-4 py-3 text-right font-semibold tabular-nums">
								{formatRating(row.rating)}
							</td>
							<td class="px-4 py-3 text-right text-muted-foreground tabular-nums">
								{row.matchCount.toLocaleString()}
							</td>
							<td
								class="hidden px-4 py-3 text-right text-muted-foreground tabular-nums md:table-cell"
							>
								{#if row.peakRating !== null}
									{formatRating(row.peakRating)}
									{#if row.peakRatingDate}
										<span class="ml-1 text-xs">{formatPeakDate(row.peakRatingDate)}</span>
									{/if}
								{:else}
									—
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if hiddenCount > 0 && !showAll}
			<div class="mt-4 text-center">
				<Button variant="outline" data-testid="ratings-show-all" onclick={() => (showAll = true)}>
					Show all {rows.length} players
				</Button>
			</div>
		{/if}
	{/if}
{/if}
