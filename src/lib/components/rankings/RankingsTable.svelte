<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { Button } from '$lib/components/ui/button';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import PlayerSearch from './PlayerSearch.svelte';
	import type { RankingRow } from '$lib/rankings/types';

	interface Props {
		rows: RankingRow[];
	}

	let { rows }: Props = $props();

	/** Rendered up front; the rest is one click away. All data is already loaded. */
	const INITIAL_ROWS = 100;

	let showAll = $state(false);
	let search = $state('');
	// SvelteSet is reactive on mutation, so rows can be toggled in place.
	const expanded = new SvelteSet<string>();

	// Filtering happens client-side: the whole series is already loaded, so
	// there is no request per keystroke.
	const filtered = $derived.by(() => {
		const needle = search.trim().toLowerCase();
		if (!needle) return rows;
		return rows.filter((row) => row.fullName.toLowerCase().includes(needle));
	});

	// While searching, show every match — a name buried at rank 200 is exactly
	// what someone is searching for.
	const visible = $derived(showAll || search.trim() ? filtered : filtered.slice(0, INITIAL_ROWS));
	const hiddenCount = $derived(search.trim() ? 0 : Math.max(0, filtered.length - INITIAL_ROWS));

	function toggle(playerId: string) {
		if (expanded.has(playerId)) expanded.delete(playerId);
		else expanded.add(playerId);
	}

	// Points can carry a decimal (e.g. 203.8) but are usually whole.
	const formatPoints = (points: number) =>
		Number.isInteger(points) ? String(points) : points.toFixed(1);

	/** Medal tint for the top three. */
	function rankClass(rank: number): string {
		if (rank === 1) return 'text-amber-500';
		if (rank === 2) return 'text-slate-400';
		if (rank === 3) return 'text-amber-700';
		return 'text-muted-foreground';
	}
</script>

{#if rows.length === 0}
	<p class="py-8 text-center text-muted-foreground">No ranked players in this division yet.</p>
{:else}
	<PlayerSearch bind:value={search} resultCount={filtered.length} testId="rankings-search" />

	{#if filtered.length === 0}
		<p class="py-8 text-center text-muted-foreground" data-testid="rankings-no-matches">
			No players match “{search}”.
		</p>
	{:else}
		<div class="overflow-hidden rounded-lg border">
			<table class="w-full text-sm" data-testid="rankings-table">
				<thead class="bg-muted/50">
					<tr>
						<th class="w-16 px-4 py-3 text-right font-medium">#</th>
						<th class="px-4 py-3 text-left font-medium">Player</th>
						<th class="w-28 px-4 py-3 text-right font-medium">Points</th>
						<th class="hidden w-24 px-4 py-3 text-right font-medium sm:table-cell">Events</th>
						<th class="w-12 px-2 py-3"><span class="sr-only">Show events</span></th>
					</tr>
				</thead>
				<tbody>
					{#each visible as row (row.playerId)}
						{@const isOpen = expanded.has(row.playerId)}
						<tr class="border-t">
							<td class="px-4 py-3 text-right font-semibold tabular-nums {rankClass(row.rank)}">
								{row.rank}
							</td>
							<td class="px-4 py-3 font-medium">{row.fullName}</td>
							<td class="px-4 py-3 text-right tabular-nums">{formatPoints(row.points)}</td>
							<td
								class="hidden px-4 py-3 text-right text-muted-foreground tabular-nums sm:table-cell"
							>
								{row.resultsCount}
							</td>
							<td class="px-2 py-3 text-right">
								{#if row.breakdown.length > 0}
									<Button
										variant="ghost"
										size="icon"
										class="size-8"
										aria-expanded={isOpen}
										aria-label="{isOpen ? 'Hide' : 'Show'} scoring events for {row.fullName}"
										data-testid="rankings-expand-{row.playerId}"
										onclick={() => toggle(row.playerId)}
									>
										<ChevronDownIcon
											class="size-4 transition-transform {isOpen ? 'rotate-180' : ''}"
										/>
									</Button>
								{/if}
							</td>
						</tr>

						{#if isOpen}
							<tr class="border-t bg-muted/30">
								<td colspan="5" class="px-4 py-3">
									<p class="mb-2 text-xs font-medium text-muted-foreground">
										Top scoring events
										{#if row.resultsCount > row.breakdown.length}
											<span class="font-normal">
												({row.breakdown.length} of {row.resultsCount})
											</span>
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
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>

		{#if hiddenCount > 0 && !showAll}
			<div class="mt-4 text-center">
				<Button variant="outline" data-testid="rankings-show-all" onclick={() => (showAll = true)}>
					Show all {filtered.length} players
				</Button>
			</div>
		{/if}
	{/if}
{/if}
