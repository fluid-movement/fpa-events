<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import EventDetailsForm from './EventDetailsForm.svelte';
	import { getEvent } from '../event-details.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const event = $derived(data.event);
	const details = $derived(await getEvent(event.id));
</script>

<EventDetailsForm event={details} onCancel={() => goto(resolve(`/events/${event.id}/admin`))} />
