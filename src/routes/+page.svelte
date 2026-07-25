<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import EventCalendarCard from '$lib/components/EventCalendarCard.svelte';
	import type { PageProps } from './$types';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import EventsMap from '$lib/components/EventsMap.svelte';

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
		<h1 class="text-5xl font-bold tracking-tight">FPA Event Calendar</h1>
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
		{#if data.eventsThisYear > 0}
			<p class="text-sm text-muted-foreground flex items-center justify-center gap-3">
				<span class="flex items-center gap-1.5">
					<CalendarIcon class="size-3.5" />
					{data.eventsThisYear} event{data.eventsThisYear === 1 ? '' : 's'} this year
				</span>
				{#if data.countries > 0}
					<span class="opacity-40">·</span>
					<span class="flex items-center gap-1.5">
						<GlobeIcon class="size-3.5" />
						{data.countries} {data.countries === 1 ? 'country' : 'countries'}
					</span>
				{/if}
			</p>
		{/if}
	</section>

	<!-- Events map -->
	<EventsMap events={data.mapEvents} />

	<!-- Next event highlight -->
	{#if event}
		<section class="max-w-lg mx-auto">
			<p class="text-sm font-medium text-muted-foreground text-center uppercase tracking-widest mb-4">
				Next Event
			</p>
			<Card.Root class="bg-card/80 backdrop-blur-sm overflow-hidden">
				{#if event.picture}
					<div class="w-full">
						<img
							src={event.picture}
							alt={event.name}
							width={event.pictureWidth ?? undefined}
							height={event.pictureHeight ?? undefined}
							class="w-full object-cover object-top max-h-48"
						/>
					</div>
				{/if}
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
						<p class="text-sm line-clamp-3">{event.description.replace(/<[^>]*>/g, ' ').trim()}</p>
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

	<!-- Upcoming events grid -->
	{#if data.upcomingEvents.length > 0}
		<section>
			<p class="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">
				Coming Up
			</p>
			<div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.upcomingEvents as ev (ev.id)}
					<EventCalendarCard event={ev} attendeeCount={ev.attendeeCount} />
				{/each}
			</div>
			<div class="mt-6 text-center">
				<Button href={resolve('/events')} variant="ghost">
					View all events
					<ArrowRightIcon class="size-4" />
				</Button>
			</div>
		</section>
	{/if}
</div>
