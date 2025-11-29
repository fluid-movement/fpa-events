<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import type { PageProps } from './$types';
	let { data, params }: PageProps = $props();

	const eventsByMonth = data.eventsByMonth;
</script>

<h1>Past Events in {params.year}</h1>

{#each eventsByMonth as { month, label, events } (month)}
	<section class="mb-8">
		<h2 class="mb-4 text-2xl font-bold">{label}</h2>
		<div class="grid gap-4 md:grid-cols-2">
			{#each events as event (event.id)}
				<Card.Root>
					<Card.Header>
						<a href={resolve(`/events/${event.id}`)}><h3>{event.name}</h3></a>
					</Card.Header>
					<Card.Content>
						<p><strong>Location:</strong> {event.location}</p>
						<p><strong>Start:</strong> {new Date(event.startDate).toLocaleString()}</p>
						<p><strong>End:</strong> {new Date(event.endDate).toLocaleString()}</p>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</section>
{:else}
	<p>No events found</p>
{/each}

<Button href={resolve('/events/create')}>Create New Event</Button>
