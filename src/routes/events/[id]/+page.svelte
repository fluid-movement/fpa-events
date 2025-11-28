<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { loadEvent } from './data.remote';
	let { params } = $props();
	
	const event = $derived(await loadEvent(params.id));
</script>

<svelte:boundary>
	{#if event}
		<p>ID: {event.id}</p>
		<p>Name: {event.name}</p>
		<p>Description: {event.description}</p>
		<p>Location: {event.location}</p>
		<p>Start Date: {new Date(event.startDate).toLocaleString()}</p>
		<p>End Date: {new Date(event.endDate).toLocaleString()}</p>
		<p>User ID: {event.userId}</p>
		<Button href={`/events/${event.id}/edit`}>Edit Event</Button>
	{:else}
		<p>Event not found</p>
	{/if}
</svelte:boundary>
