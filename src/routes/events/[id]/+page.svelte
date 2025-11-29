<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	
	const event = data.event;
</script>

<svelte:boundary>
	{#if event}
		<h1>{event.name}</h1>
		<p>{event.description}</p>
		<p>Location: {event.location}</p>
		<p>Start Date: {new Date(event.startDate).toLocaleString()}</p>
		<p>End Date: {new Date(event.endDate).toLocaleString()}</p>
		{#if data.userId === event.userId}
		  <Button href={`/events/${event.id}/edit`}>Edit Event</Button>
    {/if}
	{:else}
		<p>Event not found</p>
	{/if}
</svelte:boundary>
