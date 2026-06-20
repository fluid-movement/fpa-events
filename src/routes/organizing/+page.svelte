<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Tabs } from '$lib/components/ui/tabs';
	import { formatDateRange } from '$lib/utils/dates';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let activeTab = $state<string>('upcoming');

	const events = $derived(activeTab === 'upcoming' ? data.upcoming : data.past);
</script>

<div class="space-y-2 pb-6">
	<h1>Organizing</h1>
	<p class="text-muted-foreground">Events you're organizing.</p>
</div>

<div class="mb-6 flex items-center justify-between">
	<Tabs
		tabs={[
			{ id: 'upcoming', label: `Upcoming (${data.upcoming.length})` },
			{ id: 'past', label: `Past (${data.past.length})` }
		]}
		bind:active={activeTab}
	/>

	<Button href={resolve('/events/create')} size="sm">Create Event</Button>
</div>

{#if events.length === 0}
	<div class="py-12 text-center text-muted-foreground">
		<p class="mb-4">
			{activeTab === 'upcoming'
				? 'You are currently not organizing any upcoming events.'
				: 'No past events.'}
		</p>
		{#if activeTab === 'upcoming'}
			<Button href={resolve('/events/create')} variant="outline">Create Event</Button>
		{/if}
	</div>
{:else}
	<div class="space-y-3">
		{#each events as event (event.id)}
			<div class="rounded-lg border bg-card p-5 flex items-start justify-between gap-4">
				<div class="min-w-0 space-y-2">
					<h2 class="text-lg font-semibold leading-tight">{event.name}</h2>
					<div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
						<span class="flex items-center gap-1.5">
							<CalendarIcon class="size-3.5 shrink-0" />
							{formatDateRange(event.startDate, event.endDate)}
						</span>
						<span class="flex items-center gap-1.5">
							<MapPinIcon class="size-3.5 shrink-0" />
							{event.location}
						</span>
						<span class="flex items-center gap-1.5">
							<HeartIcon class="size-3.5 shrink-0" />
							{event.attendeeCount} attending
						</span>
					</div>
				</div>
				<div class="flex shrink-0 gap-2">
					<Button href={resolve(`/events/${event.id}`)} variant="outline" size="sm">
						View Event
					</Button>
					<Button href={resolve(`/events/${event.id}/admin`)} size="sm">
						Admin Area
					</Button>
				</div>
			</div>
		{/each}
	</div>
{/if}
