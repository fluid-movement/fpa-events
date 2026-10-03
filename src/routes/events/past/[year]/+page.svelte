<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import * as Select from '#lib/components/ui/select';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import SegmentedTabs from '#lib/components/layout/SegmentedTabs.svelte';
	import EventCalendar from '#lib/components/EventCalendar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const mostRecentYear = $derived(data.archiveYears[0] ?? data.year);

	const tabs = $derived([
		{ label: 'Upcoming', href: resolve('/events'), match: ['upcoming'] },
		{
			label: 'Past',
			href: resolve('/events/past/[year]', { year: String(mostRecentYear) }),
			match: ['past']
		}
	]);
</script>

<svelte:head>
	<title>Past Events in {data.year}</title>
</svelte:head>

<PageShell>
	<PageHeader title="Events" description="Browse past freestyle disc events.">
		{#snippet actions()}
			{#if data.archiveYears.length > 0}
				<!-- Keyed so the trigger label follows the route on back/forward. -->
				{#key data.year}
					<Select.Root
						type="single"
						value={String(data.year)}
						onValueChange={(val) => {
							if (val) goto(resolve('/events/past/[year]', { year: String(val) }));
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
				{/key}
			{/if}
		{/snippet}
	</PageHeader>

	<SegmentedTabs {tabs} current="past" label="Event archive" fill class="mb-6 md:mb-8" />

	<EventCalendar eventsByMonth={data.eventsByMonth} />
</PageShell>
