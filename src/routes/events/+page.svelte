<script lang="ts">
	import { resolve } from '$app/paths';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import SegmentedTabs from '#lib/components/layout/SegmentedTabs.svelte';
	import EventCalendar from '#lib/components/EventCalendar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const mostRecentYear = $derived(data.archiveYears[0] ?? new Date().getFullYear() - 1);

	// Matched on a plain key rather than the pathname: the Past tab points at
	// whichever year is most recent, which isn't the year currently being viewed.
	const tabs = $derived([
		{ label: 'Upcoming', href: resolve('/events'), match: ['upcoming'] },
		{
			label: 'Past',
			href: resolve('/events/past/[year]', { year: String(mostRecentYear) }),
			match: ['past']
		}
	]);
</script>

<PageShell>
	<PageHeader title="Events" description="Browse freestyle disc events." />

	<SegmentedTabs {tabs} current="upcoming" label="Event archive" fill class="mb-6 md:mb-8" />

	<EventCalendar eventsByMonth={data.eventsByMonth} />
</PageShell>
