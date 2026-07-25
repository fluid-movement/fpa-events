<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import { formatDateRange } from '$lib/utils/dates';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="space-y-2 pb-6">
	<h1>Organizing</h1>
	<p class="text-muted-foreground">Events you're organizing.</p>
</div>

<Tabs.Root value="upcoming">
	<div class="mb-6 flex items-center justify-between">
		<Tabs.List>
			<Tabs.Trigger value="upcoming">Upcoming ({data.upcoming.length})</Tabs.Trigger>
			<Tabs.Trigger value="past">Past ({data.past.length})</Tabs.Trigger>
		</Tabs.List>
		<Button href={resolve('/events/create')} size="sm">Create Event</Button>
	</div>

	<Tabs.Content value="upcoming">
		{#if data.upcoming.length === 0}
			<div class="py-12 text-center text-muted-foreground">
				<p class="mb-4">You are currently not organizing any upcoming events.</p>
				<Button href={resolve('/events/create')} variant="outline">Create Event</Button>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.upcoming as event (event.id)}
					<div class="rounded-lg border bg-card p-5 flex items-start justify-between gap-4">
						<div class="min-w-0 space-y-2">
							<div class="flex flex-wrap items-center gap-2">
								<h2 class="text-lg font-semibold leading-tight">{event.name}</h2>
								{#if !event.isOwner}
									<Badge variant="outline" data-testid="co-organizer-badge">Co-organizer</Badge>
								{/if}
							</div>
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
								View public page
							</Button>
							<Button href={resolve(`/events/${event.id}/admin`)} size="sm">Manage event</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Tabs.Content>

	<Tabs.Content value="past">
		{#if data.past.length === 0}
			<div class="py-12 text-center text-muted-foreground">
				<p>No past events.</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.past as event (event.id)}
					<div class="rounded-lg border bg-card p-5 flex items-start justify-between gap-4">
						<div class="min-w-0 space-y-2">
							<div class="flex flex-wrap items-center gap-2">
								<h2 class="text-lg font-semibold leading-tight">{event.name}</h2>
								{#if !event.isOwner}
									<Badge variant="outline" data-testid="co-organizer-badge">Co-organizer</Badge>
								{/if}
							</div>
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
								View public page
							</Button>
							<Button href={resolve(`/events/${event.id}/admin`)} size="sm">Manage event</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Tabs.Content>
</Tabs.Root>
