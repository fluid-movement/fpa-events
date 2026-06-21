<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import EventCalendar from '$lib/components/EventCalendar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const mostRecentYear = $derived(data.archiveYears[0] ?? new Date().getFullYear() - 1);
</script>

<div class="space-y-2 pb-6">
	<h1>Events</h1>
	<p class="text-muted-foreground">Browse freestyle disc events.</p>
</div>

<div class="mb-8 p-1.5 w-full flex gap-2 border bg-muted/40 rounded-lg">
	<Button class="flex-1" variant="default" href={resolve('/events')}>Upcoming Events</Button>
	<Button class="flex-1" variant="ghost" href={resolve(`/events/past/${mostRecentYear}`)}>
		Past Events
	</Button>
</div>

<EventCalendar eventsByMonth={data.eventsByMonth} />
