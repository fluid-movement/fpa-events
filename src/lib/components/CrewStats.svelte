<script lang="ts">
	import UsersIcon from '@lucide/svelte/icons/users';
	import DiscIcon from '@lucide/svelte/icons/disc';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import SunIcon from '@lucide/svelte/icons/sun';
	import TrophyIcon from '@lucide/svelte/icons/trophy';
	import * as Card from '#lib/components/ui/card';
	import type { CrewStats } from '#lib/server/crewStats';

	let { stats }: { stats: CrewStats } = $props();
	const tiles = $derived([
		{ id: 'members', icon: UsersIcon, label: 'Crew mates', value: String(stats.members) },
		{ id: 'past', icon: DiscIcon, label: 'Jams in the books', value: String(stats.pastEvents) },
		{
			id: 'upcoming',
			icon: CalendarIcon,
			label: 'More jams ahead',
			value: String(stats.upcomingEvents)
		},
		{ id: 'rsvps', icon: HeartIcon, label: 'RSVPs along the way', value: String(stats.totalRsvps) },
		{ id: 'years', icon: SparklesIcon, label: 'Keeping discs flying', value: stats.yearsOfJams },
		{
			id: 'month',
			icon: SunIcon,
			label: 'Busiest month',
			value: stats.busiestMonth ?? 'Your month is waiting'
		},
		{
			id: 'biggest',
			icon: TrophyIcon,
			label: 'Biggest jam',
			value: stats.biggestJam
				? `${stats.biggestJam.name} (${stats.biggestJam.attendees} players)`
				: 'The first jam awaits'
		}
	]);
</script>

<section aria-label="Crew fun stats" class="flex flex-col gap-4" data-testid="crew-stats">
	<h2>A little local jam lore</h2>
	<p class="text-muted-foreground">Crew mates here, jam memories from the whole city.</p>
	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each tiles as tile (tile.id)}
			<Card.Root data-testid={`crew-stat-${tile.id}`}>
				<Card.Header>
					<Card.Description
						><tile.icon class="inline" aria-hidden="true" /> {tile.label}</Card.Description
					>
					<Card.Title>{tile.value}</Card.Title>
				</Card.Header>
			</Card.Root>
		{/each}
	</div>
</section>
