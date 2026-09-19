<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import Section from '$lib/components/layout/Section.svelte';
	import ServiceUnavailable from '$lib/components/layout/ServiceUnavailable.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import PlayerCareer from './PlayerCareer.svelte';
	import { getPlayerProfile } from '$lib/api/players.remote';
	import { formatPoints } from '$lib/utils/numbers';
	import { parseApiDate } from '$lib/utils/dates';

	let { playerId, backHref }: { playerId: string; backHref: string } = $props();

	const profile = $derived(await getPlayerProfile(playerId));

	const year = (date: string | null) => parseApiDate(date)?.getFullYear();

	const activeRange = $derived.by(() => {
		if (!profile.ok) return null;
		const from = year(profile.data.stats.firstEventDate);
		const to = year(profile.data.stats.lastEventDate);
		if (!from && !to) return null;
		return from === to ? String(from) : `${from ?? '?'} – ${to ?? '?'}`;
	});

	const divisionLabel = (division: string) => division.charAt(0).toUpperCase() + division.slice(1);
</script>

{#if !profile.ok}
	<PageHeader title="Player" back={{ href: backHref, label: 'All results' }} />
	<ServiceUnavailable
		title="This profile is temporarily unavailable"
		message={profile.message}
		testId="player-unavailable"
	/>
{:else}
	<PageHeader
		title={profile.data.fullName}
		eyebrow="Player"
		back={{ href: backHref, label: 'All results' }}
	>
		{#snippet badge()}
			{#if profile.data.country}
				<Badge variant="outline">{profile.data.country}</Badge>
			{/if}
		{/snippet}
		{#snippet meta()}
			{#if activeRange}
				<span>Active {activeRange}</span>
			{/if}
		{/snippet}
	</PageHeader>

	<div class="mb-6 grid grid-cols-3 gap-3" data-testid="player-stats">
		{#each [{ label: 'Events', value: profile.data.stats.eventCount }, { label: 'Wins', value: profile.data.stats.wins }, { label: 'Podiums', value: profile.data.stats.podiums }] as stat (stat.label)}
			<div class="surface-sunken rounded-xl px-4 py-3 text-center">
				<p class="text-2xl font-semibold tabular-nums">{stat.value}</p>
				<p class="text-xs text-muted-foreground">{stat.label}</p>
			</div>
		{/each}
	</div>

	{#if profile.data.rankings.length > 0 || profile.data.ratings.length > 0}
		<Section title="Current standing" class="mb-6">
			<ul class="space-y-2" data-testid="player-standings">
				{#each profile.data.rankings as ranking (ranking.series)}
					<li class="surface-row flex items-baseline gap-3 rounded-xl px-4 py-3">
						<span class="flex-1 text-sm">
							Ranking · {divisionLabel(ranking.division)}
						</span>
						<span class="font-semibold tabular-nums">#{ranking.rank}</span>
						<span class="text-sm text-muted-foreground tabular-nums">
							{formatPoints(ranking.points)} pts
						</span>
					</li>
				{/each}
				{#each profile.data.ratings as rating (rating.series)}
					<li class="surface-row flex items-baseline gap-3 rounded-xl px-4 py-3">
						<span class="flex-1 text-sm">
							Rating · {divisionLabel(rating.division)}
						</span>
						<span class="font-semibold tabular-nums">#{rating.rank}</span>
						<!-- A rating without its sample size is misleading, so the match
						     count is never dropped, even on a phone. -->
						<span class="text-sm text-muted-foreground tabular-nums">
							{Math.round(rating.rating).toLocaleString()} · {rating.matchCount} matches
						</span>
					</li>
				{/each}
			</ul>
		</Section>
	{/if}

	<Section title="Results">
		<PlayerCareer career={profile.data.career} />
	</Section>
{/if}
