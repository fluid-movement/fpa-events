<script lang="ts">
 	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	
	const event = data.nextEvent;
</script>

<h1>NEW Event page wow</h1>
{#if event}
  <h2>Next Event: {event.name}</h2>
  <p><strong>Location:</strong> {event.location}</p>
  <p><strong>Start:</strong> {new Date(event.startDate).toLocaleString()}</p>
  <p><strong>End:</strong> {new Date(event.endDate).toLocaleString()}</p>
{:else}
  <p>No upcoming events.</p>
{/if}