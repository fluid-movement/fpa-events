<script lang="ts">
	import { resolve } from '$app/paths';
	import { rankTint } from '$lib/rankings/playerList.svelte';
	import { formatPoints } from '$lib/utils/numbers';
	import { UNKNOWN_PLAYER_LABEL } from '$lib/results/types';
	import type { Team } from '$lib/server/fpa-api/types';

	let {
		team,
		/**
		 * Whether a top-three finish here is a medal. True only in the final —
		 * winning a semifinal pool is not a podium, and tinting it gold would say
		 * it was.
		 */
		podium
	}: { team: Team; podium: boolean } = $props();

	const tint = $derived(
		podium && team.place !== null ? rankTint(team.place) : 'text-muted-foreground'
	);
</script>

<li class="flex items-baseline gap-3 border-t px-4 py-2.5 first:border-t-0">
	<span class="w-6 shrink-0 text-right font-semibold tabular-nums {tint}">
		{team.place ?? '—'}
	</span>

	<span class="min-w-0 flex-1">
		{#each team.players as player, i (player.id + i)}
			{#if i > 0}<span class="text-muted-foreground">
					·
				</span>{/if}{#if player.unknown}<!--
				A GUID missing from the player directory. Shown rather than dropped —
				filtering it would silently turn a trio into a pair — but not linked,
				because there is no profile behind it.
			--><span
					class="text-muted-foreground italic">{UNKNOWN_PLAYER_LABEL}</span
				>{:else}<a
					href={resolve(`/players/${player.id}`)}
					class="hover:text-primary hover:underline"
					data-testid="placing-player-{player.id}">{player.fullName}</a
				>{/if}
		{/each}
	</span>

	{#if team.points !== null}
		<!-- Desktop only, and muted: `points` means opposite things under
		     different rulesets and the ruleset is not in the data, so it is a
		     record of what was scored, never something to compare or sort by. -->
		<span class="hidden shrink-0 text-sm text-muted-foreground tabular-nums md:inline">
			{formatPoints(team.points)}
		</span>
	{/if}
</li>
