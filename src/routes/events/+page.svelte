<script lang="ts">
	import { getAllEvents } from './events.remote';

	const eventsQuery = getAllEvents();
</script>

<h1>Events</h1>

{#if eventsQuery.error}
	<p class="error">Error loading events: {eventsQuery.error.message}</p>
{:else if eventsQuery.loading}
	<p>Loading events...</p>
{:else if eventsQuery.current}
	<ul>
		{#each eventsQuery.current as event (event.id)}
			<li>
				<h2>{event.name}</h2>
				<p><strong>Location:</strong> {event.location}</p>
				<p><strong>Start:</strong> {new Date(event.startDate).toLocaleString()}</p>
				<p><strong>End:</strong> {new Date(event.endDate).toLocaleString()}</p>
				<p>{event.description}</p>
			</li>
		{:else}
			<li>No events found</li>
		{/each}
	</ul>
{/if}