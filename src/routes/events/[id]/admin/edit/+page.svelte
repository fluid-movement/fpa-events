<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import EventDetailsForm from '$lib/components/event-admin/EventDetailsForm.svelte';
	import { getEvent, updateEvent } from '../event-details.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const event = $derived(data.event);
	const details = $derived(await getEvent(event.id));
</script>

<EventDetailsForm
	event={details}
	updateEventForm={updateEvent}
	onCancel={() => goto(resolve(`/events/${event.id}/admin`))}
/>
