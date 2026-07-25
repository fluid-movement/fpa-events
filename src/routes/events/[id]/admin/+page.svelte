<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import EventDetailsView from '$lib/components/event-admin/EventDetailsView.svelte';
	import DangerZone from '$lib/components/event-admin/DangerZone.svelte';
	import { getEvent } from './event-details.remote';
	import { deleteEvent } from './delete-event.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const event = $derived(data.event);
	const isOwner = $derived(data.isOwner);
	const details = $derived(await getEvent(event.id));
</script>

<div>
	<div class="mb-3 flex items-center justify-between gap-4">
		<h2 class="text-sm font-medium text-muted-foreground">Event details</h2>
		<Button
			href={resolve(`/events/${event.id}/admin/edit`)}
			variant="outline"
			size="sm"
			data-testid="edit-details"
		>
			<PencilIcon class="size-4" />
			Edit details
		</Button>
	</div>
	<EventDetailsView event={details} />
</div>

{#if isOwner}
	<DangerZone eventId={event.id} eventName={details.name} deleteEventForm={deleteEvent} />
{/if}
