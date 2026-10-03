<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import { Switch } from '#lib/components/ui/switch';
	import LocationsList from './LocationsList.svelte';
	import ScheduleList from '#lib/components/schedule/ScheduleList.svelte';
	import VenueLocationPicker from '#lib/components/VenueLocationPicker.svelte';
	import { listEventLocations, createEventLocation } from './locations.remote';
	import { addSchedule, updateSchedule, deleteSchedule } from './schedule.remote';
	import { getEvent } from '../event-details.remote';
	import { daysBetween } from '#lib/utils/dates';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const event = $derived(data.event);
	const schedules = $derived(data.schedules);
	const eventLat = $derived(data.eventLat ?? undefined);
	const eventLng = $derived(data.eventLng ?? undefined);

	const locations = $derived(await listEventLocations(event.id));
	// Shared keyed query with the layout — deduped, not re-fetched.
	const details = $derived(await getEvent(event.id));

	let showVenuePicker = $state(false);
	/** Location dialog: name-only by default, map picker opt-in. */
	let useMapForLocation = $state(false);

	// Start each new location from the simple form.
	$effect(() => {
		if (showVenuePicker) useMapForLocation = false;
	});

	const eventDays = $derived(daysBetween(details.startDate, details.endDate));
</script>

<div class="mb-8">
	<LocationsList
		locations={locations ?? []}
		onAddClick={() => (showVenuePicker = true)}
		eventId={event.id}
	/>
</div>

<ScheduleList
	{schedules}
	eventId={event.id}
	editable={true}
	{eventDays}
	locations={locations ?? []}
	addScheduleForm={addSchedule}
	updateScheduleForm={updateSchedule}
	deleteScheduleForm={deleteSchedule}
/>

<!-- Add Location Dialog: a name is enough; the map is opt-in. -->
<Dialog.Root bind:open={showVenuePicker}>
	<Dialog.Content class={useMapForLocation ? 'max-w-4xl' : 'max-w-md'}>
		<Dialog.Header>
			<Dialog.Title>Add Location</Dialog.Title>
			<Dialog.Description>
				{useMapForLocation
					? 'Search for a venue, then drag the pin to fine-tune.'
					: 'A name is all you need. Add a position on the map only if you want one.'}
			</Dialog.Description>
		</Dialog.Header>
		<form {...createEventLocation} onsubmit={() => (showVenuePicker = false)} class="space-y-4">
			<input {...createEventLocation.fields.eventId.as('hidden', event.id)} />

			<!-- Exactly one mode renders at a time, so `name`/`address` never collide.
			     The picker supplies its own name, address and coordinate fields. -->
			{#if useMapForLocation}
				<VenueLocationPicker fields={createEventLocation.fields} lat={eventLat} lng={eventLng} />
			{:else}
				<div class="space-y-3">
					<div class="space-y-1.5">
						<Label for="location-name">Location name</Label>
						<Input
							id="location-name"
							placeholder="Main field, Sports hall, Beach…"
							required
							data-testid="location-name-input"
							{...createEventLocation.fields.name.as('text')}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="location-address">
							Address <span class="text-muted-foreground">(optional)</span>
						</Label>
						<Input
							id="location-address"
							placeholder="Street, city"
							{...createEventLocation.fields.address.as('text')}
						/>
					</div>
				</div>
			{/if}

			<div class="flex items-center gap-3 border-t pt-4">
				<Switch id="use-map" bind:checked={useMapForLocation} data-testid="use-map-switch" />
				<Label for="use-map" class="text-sm font-normal text-muted-foreground">
					Set a position on the map
				</Label>
			</div>

			<Dialog.Footer>
				<Button variant="outline" type="button" onclick={() => (showVenuePicker = false)}>
					Cancel
				</Button>
				<Button
					type="submit"
					data-testid="save-location"
					disabled={createEventLocation.pending > 0}
				>
					{createEventLocation.pending > 0 ? 'Saving…' : 'Save Location'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
