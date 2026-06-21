<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import EventCalendar from '$lib/components/EventCalendar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

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
	<div class="flex justify-end mb-8">
		<Select.Root
			value={String(data.year)}
			onValueChange={(val) => {
				if (val) goto(resolve(`/events/past/${val}`));
			}}
		>
			<Select.Trigger class="w-32">
				{data.year}
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					{#each data.archiveYears as y (y)}
						<Select.Item value={String(y)}>{y}</Select.Item>
					{/each}
				</Select.Group>
			</Select.Content>
		</Select.Root>
	</div>
{/if}

<EventCalendar eventsByMonth={data.eventsByMonth} />
