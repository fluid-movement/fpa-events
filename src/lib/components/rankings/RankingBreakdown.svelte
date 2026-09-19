<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { getScoringResults } from '#lib/api/rankings.remote';
	import { formatPoints } from '#lib/utils/numbers';
	import { rankTint } from '#lib/rankings/playerList.svelte';
	import { UNKNOWN_PLAYER_LABEL } from '#lib/results/types';

	let {
		playerId,
		fullName,
		series
	}: {
		playerId: string;
		fullName: string;
		/** Which ranking series these points come from. */
		series: string;
	} = $props();

	// Started when the row is expanded, which is when this component is created.
	// `{#await}` rather than an awaited `$derived`: this renders only on the
	// client, and the block gives a pending and an error branch without needing
	// a boundary around every expanded row.
	//
	// Read once with `untrack`: the caller keys this component on `playerId`, so
	// a different player gets a new instance rather than a refetch here.
	const pending = untrack(() => getScoringResults({ playerId, series }));

	const eventHref = (eventId: string, division: string) =>
		`${resolve('/results/[eventId]', { eventId: eventId })}?division=${encodeURIComponent(division)}`;

	const partners = (teammates: Array<{ fullName: string; unknown: boolean }>) =>
		teammates.map((t) => (t.unknown ? UNKNOWN_PLAYER_LABEL : t.fullName)).join(' · ');

	// Only a top-three finish in the final is a medal. Winning a semifinal pool
	// is a place, not a podium, and tinting it gold would claim otherwise.
	const placeTint = (place: number, roundName: string) =>
		roundName === 'Finals' ? rankTint(place) : 'text-muted-foreground';
</script>

{#await pending}
	<p class="text-xs text-muted-foreground" data-testid="rankings-breakdown-loading">
		Loading scoring events…
	</p>
{:then result}
	{#if !result.ok}
		<p class="text-xs text-muted-foreground">Could not load the scoring events for {fullName}.</p>
	{:else if result.data.length === 0}
		<p class="text-xs text-muted-foreground">No scoring events recorded.</p>
	{:else}
		<p class="mb-2 text-xs font-medium text-muted-foreground">
			Scoring events ({result.data.length})
		</p>
		<ul class="space-y-1.5" data-testid="rankings-breakdown-{playerId}">
			{#each result.data as entry (entry.resultId)}
				<li class="flex items-baseline justify-between gap-4">
					<span class="min-w-0">
						{#if entry.eventId}
							<a
								href={eventHref(entry.eventId, entry.division)}
								class="hover:text-primary hover:underline"
								data-testid="rankings-breakdown-event-{entry.resultId}"
							>
								{entry.eventName}
							</a>
						{:else}
							<!-- No event id upstream, so there is nothing to link to. -->
							{entry.eventName}
						{/if}
						<span class="text-muted-foreground">· {entry.division}</span>

						{#if entry.place !== null && entry.roundName}
							<span class="text-muted-foreground">
								· <span class={placeTint(entry.place, entry.roundName)}>{entry.place}</span>
								in {entry.roundName}
							</span>
						{/if}

						{#if entry.teammates.length > 0}
							<span class="block text-xs text-muted-foreground">
								with {partners(entry.teammates)}
							</span>
						{/if}
					</span>
					<span class="shrink-0 tabular-nums">{formatPoints(entry.points)}</span>
				</li>
			{/each}
		</ul>
	{/if}
{:catch}
	<p class="text-xs text-muted-foreground">Could not load the scoring events for {fullName}.</p>
{/await}
