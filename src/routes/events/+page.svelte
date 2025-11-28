<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from "$lib/components/ui/card";
	import { getAllEvents } from './data.remote';
</script>

<h1>Events</h1>
<Button href={resolve('/events/create')}>Create New Event</Button>
<div class="grid md:grid-cols-2">
	{#each await getAllEvents() as event (event.id)}
		<Card.Root>
			<a href={resolve(`/events/${event.id}`)}><h2>{event.name}</h2></a>
			<p><strong>Location:</strong> {event.location}</p>
			<p><strong>Start:</strong> {new Date(event.startDate).toLocaleString()}</p>
			<p><strong>End:</strong> {new Date(event.endDate).toLocaleString()}</p>
		</Card.Root>
	{:else}
		<li>No events found</li>
	{/each}
</div>
