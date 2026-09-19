<script lang="ts">
	import { resolve } from '$app/paths';
	import EmptyState from '$lib/components/layout/EmptyState.svelte';
	import { rankTint } from '$lib/rankings/playerList.svelte';
	import { parseApiDate } from '$lib/utils/dates';
	import { UNKNOWN_PLAYER_LABEL, type CareerEntry } from '$lib/results/types';

	let { career }: { career: CareerEntry[] } = $props();

	// Year only: a career list is scanned by era, and the full date is on the
	// event page one click away.
	const year = (date: string | null) => parseApiDate(date)?.getFullYear() ?? '—';

	const teammateNames = (entry: CareerEntry) =>
		entry.teammates.map((t) => (t.unknown ? UNKNOWN_PLAYER_LABEL : t.fullName)).join(' · ');
</script>

{#if career.length === 0}
	<EmptyState title="No recorded results" size="compact" />
{:else}
	<ul class="space-y-2" data-testid="player-career">
		{#each career as entry (entry.eventId + entry.division)}
			<li>
				<a
					href={resolve(`/results/${entry.eventId}`)}
					class="surface-row flex items-center gap-3 rounded-xl px-4 py-3"
				>
					<span
						class="w-6 shrink-0 text-right font-semibold tabular-nums {entry.roundName ===
							'Finals' && entry.place !== null
							? rankTint(entry.place)
							: 'text-muted-foreground'}"
					>
						{entry.place ?? '—'}
					</span>

					<span class="min-w-0 flex-1">
						<span class="block truncate font-medium">{entry.eventName}</span>
						<span class="block truncate text-sm text-muted-foreground">
							{entry.division} · {entry.roundName}
							{#if entry.teammates.length > 0}
								· with {teammateNames(entry)}
							{/if}
						</span>
					</span>

					<span class="shrink-0 text-sm text-muted-foreground tabular-nums">
						{year(entry.eventDate)}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
