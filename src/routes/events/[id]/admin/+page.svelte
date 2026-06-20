<script lang="ts">
	import { resolve } from '$app/paths';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import type { PageProps } from './$types';
	import { listEventLocations, createEventLocation, deleteEventLocation } from './locations.remote';
	import VenueLocationPicker from '$lib/components/VenueLocationPicker.svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import AttendeeList from '$lib/components/event-admin/AttendeeList.svelte';
	import LocationsList from '$lib/components/event-admin/LocationsList.svelte';
	import InviteSection from '$lib/components/event-admin/InviteSection.svelte';
	import DangerZone from '$lib/components/event-admin/DangerZone.svelte';
	import ScheduleList from '$lib/components/schedule/ScheduleList.svelte';

	let { data }: PageProps = $props();
	const event = $derived(data.event);
	const attendees = $derived(data.attendees);
	const schedules = $derived(data.schedules);
	const magicLink = $derived(data.magicLink);
	const origin = $derived(data.origin);
	const eventLat = $derived(data.eventLat ?? undefined);
	const eventLng = $derived(data.eventLng ?? undefined);

	let showVenuePicker = $state(false);

	const eventId = $derived(event.id);
	const eventLocationsList = $derived(await listEventLocations(eventId));

	function toISODate(d: Date) {
		const pad = (n: number) => n.toString().padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	}

	const eventDays = $derived.by(() => {
		const days: string[] = [];
		const cur = new SvelteDate(event.startDate);
		const end = new SvelteDate(event.endDate);
		while (cur <= end) {
			days.push(toISODate(cur));
			cur.setDate(cur.getDate() + 1);
		}
		return days;
	});

	const magicLinkUrl = $derived(magicLink ? `${origin}/invite/${magicLink.id}` : null);
	const organizers = $derived(
		attendees.filter((a) => a.status === 'organizing' && a.userId !== event.userId)
	);
</script>

<div class="mx-auto max-w-4xl">
	<div class="mb-4 flex items-center justify-between">
		<Button href={resolve('/organizing')} variant="ghost" size="sm">
			<ArrowLeftIcon class="size-4" />
			Organizing
		</Button>
		<div class="flex gap-2">
			<Button href={resolve(`/events/${event.id}`)} variant="outline" size="sm">View Event</Button>
			<Button href={resolve(`/events/${event.id}/edit`)} variant="outline" size="sm">
				Edit Event
			</Button>
		</div>
	</div>

	<div class="space-y-1 pb-6">
		<h1 class="text-2xl font-bold">{event.name}</h1>
		<p class="text-muted-foreground">Event Admin</p>
	</div>

	<Tabs.Root value="attending" class="mb-6">
		<Tabs.List>
			<Tabs.Trigger value="attending">Attending ({attendees.length})</Tabs.Trigger>
			<Tabs.Trigger value="schedule">Schedule ({schedules.length})</Tabs.Trigger>
			<Tabs.Trigger value="invite">Invite</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="attending">
			<AttendeeList {attendees} />
		</Tabs.Content>
		<Tabs.Content value="schedule">
			<div class="mb-8">
				<LocationsList
					locations={eventLocationsList ?? []}
					onAddClick={() => (showVenuePicker = true)}
					eventId={event.id}
					deleteAction={deleteEventLocation}
				/>
			</div>
			<ScheduleList
				{schedules}
				editable={true}
				{eventDays}
				locations={eventLocationsList ?? []}
			/>
		</Tabs.Content>
		<Tabs.Content value="invite">
			<InviteSection
				{magicLink}
				{magicLinkUrl}
				{organizers}
			/>
		</Tabs.Content>
	</Tabs.Root>

	<DangerZone eventName={event.name} />

	<!-- Venue Location Picker Dialog -->
	<Dialog.Root bind:open={showVenuePicker}>
		<Dialog.Content class="max-w-4xl">
			<Dialog.Header>
				<Dialog.Title>Add New Location</Dialog.Title>
				<Dialog.Description>Search for a venue, then drag the pin to fine-tune.</Dialog.Description>
			</Dialog.Header>
			<form {...createEventLocation} onsubmit={() => (showVenuePicker = false)} class="space-y-4">
				<input type="hidden" name="eventId" value={event.id} />
				<VenueLocationPicker lat={eventLat} lng={eventLng} />
				<Dialog.Footer>
					<Button variant="outline" type="button" onclick={() => (showVenuePicker = false)}>
						Cancel
					</Button>
					<Button type="submit">Save Location</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</div>
