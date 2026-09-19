<script lang="ts">
	import EmptyState from '#lib/components/layout/EmptyState.svelte';
	import PlacingRow from './PlacingRow.svelte';
	import type { DivisionResult, Team } from '#lib/server/fpa-api/types';

	let { result }: { result: DivisionResult } = $props();

	/**
	 * Teams in finishing order.
	 *
	 * The API documents pools as already ordered by placement, but sorting on
	 * `place` costs nothing and is the one ordering that is always correct:
	 * `points` means opposite things under FPA2020 and SimpleRanking, and the
	 * ruleset is not exposed. A team with no recorded place goes last.
	 */
	function byPlace(teams: Team[]): Team[] {
		return [...teams].sort((a, b) => {
			if (a.place === b.place) return 0;
			if (a.place === null) return 1;
			if (b.place === null) return -1;
			return a.place - b.place;
		});
	}
</script>

{#if result.rounds.length === 0}
	<EmptyState title="No rounds recorded for this division" size="compact" />
{:else}
	<div class="space-y-6" data-testid="division-results">
		{#each result.rounds as round (round.number)}
			<section data-testid="round-{round.number}">
				<!-- Labelled from `name`, never from `number`: rounds count backwards
				     from the final and are not contiguous. -->
				<h2 class="mb-2 text-sm font-semibold tracking-wide uppercase">{round.name}</h2>

				<div class="overflow-hidden rounded-xl border">
					{#each round.pools as pool, i (pool.name)}
						<!-- A single-pool round is just "the round"; naming its pool would
						     be noise. -->
						{#if round.pools.length > 1}
							<p
								class="surface-sunken px-4 py-1.5 text-xs font-medium text-muted-foreground {i > 0
									? 'border-t'
									: ''}"
							>
								Pool {pool.name}
							</p>
						{/if}
						<ul class={i > 0 && round.pools.length === 1 ? 'border-t' : ''}>
							{#each byPlace(pool.teams) as team, j (j)}
								<PlacingRow {team} podium={round.number === 1} />
							{/each}
						</ul>
					{/each}
				</div>
			</section>
		{/each}
	</div>
{/if}
