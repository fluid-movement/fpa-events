<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import Section from '$lib/components/layout/Section.svelte';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import EventDetailsView from './EventDetailsView.svelte';
	import DangerZone from './DangerZone.svelte';
	import { getEvent } from './event-details.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const event = $derived(data.event);
	const isOwner = $derived(data.isOwner);
	const details = $derived(await getEvent(event.id));
</script>

<Section title="Event details">
	{#snippet action()}
		<Button
			href={resolve(`/events/${event.id}/admin/edit`)}
			variant="outline"
			size="sm"
			data-testid="edit-details"
		>
			<PencilIcon />
			Edit details
		</Button>
	{/snippet}
	<EventDetailsView event={details} />
</Section>

{#if isOwner}
	<DangerZone eventId={event.id} eventName={details.name} />
{/if}
