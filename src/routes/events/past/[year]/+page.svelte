<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import EventCalendar from '$lib/components/EventCalendar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const RADIO_COUNT = 3;
	const radioYears = $derived(data.archiveYears.slice(0, RADIO_COUNT));
	const dropdownYears = $derived(data.archiveYears.slice(RADIO_COUNT));
	const mostRecentYear = $derived(data.archiveYears[0] ?? data.year);
</script>

<svelte:head>
	<title>Past Events in {data.year}</title>
</svelte:head>

<div class="space-y-2 pb-6">
	<h1>Events</h1>
	<p class="text-muted-foreground">Browse freestyle disc events.</p>
</div>

<!-- Upcoming / Past toggle -->
<div class="mb-6 p-1.5 w-full flex gap-2 border bg-muted/40 rounded-lg">
	<Button class="flex-1" variant="ghost" href={resolve('/events')}>Upcoming Events</Button>
	<Button class="flex-1" variant="default" href={resolve(`/events/past/${mostRecentYear}`)}>
		Past Events
	</Button>
</div>

<!-- Year picker -->
{#if data.archiveYears.length > 0}
	<div class="flex justify-end gap-2 mb-8">
		{#each radioYears as y (y)}
			<Button
				variant={y === data.year ? 'default' : 'ghost'}
				size="sm"
				href={resolve(`/events/past/${y}`)}
			>
				{y}
			</Button>
		{/each}
		{#if dropdownYears.length > 0}
			<select
				class="h-9 rounded-md border border-input bg-background px-3 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
				onchange={(e) => {
					const val = e.currentTarget.value;
					if (val) goto(resolve(`/events/past/${val}`));
					e.currentTarget.value = '';
				}}
			>
				<option value="" disabled selected>More</option>
				{#each dropdownYears as y (y)}
					<option value={y} selected={y === data.year}>{y}</option>
				{/each}
			</select>
		{/if}
	</div>
{/if}

<EventCalendar eventsByMonth={data.eventsByMonth} />
