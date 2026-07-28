<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import PageShell from '$lib/components/layout/PageShell.svelte';
	import EmptyState from '$lib/components/layout/EmptyState.svelte';
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

<PageShell class="space-y-10 py-2 md:space-y-12 md:py-6">
	<!-- Hero -->
	<section class="space-y-4 text-center">
		<h1 class="text-3xl font-bold tracking-tight text-balance md:text-5xl">FPA Event Calendar</h1>
		<p class="mx-auto max-w-xl text-base text-balance text-muted-foreground md:text-lg">
			Freestyle disc competitions, jams, and gatherings around the world.
		</p>
		<div class="flex flex-col justify-center gap-3 sm:flex-row">
			<Button href={resolve('/events')} size="lg">
				<CalendarIcon />
				View all events
			</Button>
			<Button href={resolve('/events/create')} variant="outline" size="lg">Create event</Button>
		</div>
		{#if data.eventsThisYear > 0}
			<p class="flex items-center justify-center gap-3 text-sm text-muted-foreground">
				<span class="flex items-center gap-1.5">
					<CalendarIcon class="size-3.5" />
					{data.eventsThisYear} event{data.eventsThisYear === 1 ? '' : 's'} this year
				</span>
				{#if data.countries > 0}
					<span class="opacity-40">·</span>
					<span class="flex items-center gap-1.5">
						<GlobeIcon class="size-3.5" />
						{data.countries}
						{data.countries === 1 ? 'country' : 'countries'}
					</span>
				{/if}
			</p>
		{/if}
	</section>

	<!-- Events map -->
	<EventsMap events={data.mapEvents} />

	<!-- Next event highlight -->
	{#if event}
		<section class="mx-auto max-w-lg">
			<p
				class="mb-4 text-center text-xs font-semibold tracking-widest text-muted-foreground uppercase"
			>
				Next event
			</p>
			<Card.Root class="surface-glass overflow-hidden">
				{#if event.picture}
					<div class="w-full">
						<img
							src={event.picture}
							alt={event.name}
							width={event.pictureWidth ?? undefined}
							height={event.pictureHeight ?? undefined}
							class="max-h-48 w-full object-cover object-top"
						/>
					</div>
				{/if}
				<Card.Header>
					<Card.Title class="text-xl md:text-2xl">{event.name}</Card.Title>
					<Card.Description class="mt-1 flex flex-col gap-1">
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
						<p class="line-clamp-3 text-sm">{event.description.replace(/<[^>]*>/g, ' ').trim()}</p>
					</Card.Content>
				{/if}
				<Card.Footer>
					<Button href={resolve(`/events/${event.id}`)} variant="outline" class="w-full">
						View details
						<ArrowRightIcon />
					</Button>
				</Card.Footer>
			</Card.Root>
		</section>
	{:else}
		<EmptyState
			icon={CalendarIcon}
			title="No upcoming events scheduled"
			description="The calendar is empty right now — be the one to fill it."
		>
			{#snippet action()}
				<Button href={resolve('/events/create')}>Create the first one</Button>
			{/snippet}
		</EmptyState>
	{/if}

	<!-- Upcoming events grid -->
	{#if data.upcomingEvents.length > 0}
		<section>
			<h2 class="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				Coming up
			</h2>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.upcomingEvents as ev (ev.id)}
					<EventCalendarCard event={ev} attendeeCount={ev.attendeeCount} />
				{/each}
			</div>
			<div class="mt-6 text-center">
				<Button href={resolve('/events')} variant="ghost">
					View all events
					<ArrowRightIcon />
				</Button>
			</div>
		</section>
	{/if}
</PageShell>
