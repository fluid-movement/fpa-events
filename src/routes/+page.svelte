<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { PageProps } from './$types';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';

	let { data }: PageProps = $props();
	const event = $derived(data.nextEvent);

	function formatDateRange(start: Date, end: Date) {
		const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
		const startStr = start.toLocaleDateString('en-US', opts);
		const endStr = end.toLocaleDateString('en-US', opts);
		return start.toDateString() === end.toDateString() ? startStr : `${startStr} – ${endStr}`;
	}
</script>

<div class="space-y-12 py-6">
	<!-- Hero -->
	<section class="text-center space-y-4">
		<h1 class="text-5xl font-bold tracking-tight">FPA Events</h1>
		<p class="text-lg text-muted-foreground max-w-xl mx-auto">
			Freestyle disc competitions, jams, and gatherings around the world.
		</p>
		<div class="flex justify-center gap-3">
			<Button href={resolve('/events')} size="lg">
				<CalendarIcon class="size-4" />
				View All Events
			</Button>
			<Button href={resolve('/events/create')} variant="outline" size="lg">
				Create Event
			</Button>
		</div>
	</section>

	<!-- Next event highlight -->
	{#if event}
		<section class="max-w-lg mx-auto">
			<p class="text-sm font-medium text-muted-foreground text-center uppercase tracking-widest mb-4">
				Next Event
			</p>
			<Card.Root class="bg-card/80 backdrop-blur-sm">
				<Card.Header>
					<Card.Title class="text-2xl">{event.name}</Card.Title>
					<Card.Description class="flex flex-col gap-1 mt-1">
						<span class="flex items-center gap-1.5">
							<CalendarIcon class="size-3.5" />
							{formatDateRange(new Date(event.startDate), new Date(event.endDate))}
						</span>
						<span class="flex items-center gap-1.5">
							<MapPinIcon class="size-3.5" />
							{event.location}
						</span>
					</Card.Description>
				</Card.Header>
				{#if event.description}
					<Card.Content>
						<p class="text-sm line-clamp-3">{event.description}</p>
					</Card.Content>
				{/if}
				<Card.Footer>
					<Button href={resolve(`/events/${event.id}`)} variant="outline" class="w-full">
						View Details
						<ArrowRightIcon class="size-4" />
					</Button>
				</Card.Footer>
			</Card.Root>
		</section>
	{:else}
		<section class="text-center text-muted-foreground">
			<p>No upcoming events scheduled.</p>
			<Button href={resolve('/events/create')} variant="link">Create the first one</Button>
		</section>
	{/if}
</div>
