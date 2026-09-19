<script lang="ts">
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import SegmentedTabs from '#lib/components/layout/SegmentedTabs.svelte';
	import ServiceUnavailable from '#lib/components/layout/ServiceUnavailable.svelte';
	import EmptyState from '#lib/components/layout/EmptyState.svelte';
	import DivisionResults from './DivisionResults.svelte';
	import { getEventResults } from '#lib/api/results.remote';
	import { formatApiDateRange } from '#lib/utils/dates';

	let {
		eventId,
		/** Division from the URL. Falls back to the first one the event has. */
		division,
		backHref,
		divisionHref
	}: {
		eventId: string;
		division: string | undefined;
		backHref: string;
		divisionHref: (division: string) => string;
	} = $props();

	const event = $derived(await getEventResults(eventId));

	// Resolve against what the event actually has, so a stale link from another
	// event's division lands on real results rather than an empty page.
	const active = $derived.by(() => {
		if (!event.ok) return undefined;
		const names = event.data.results.map((r) => r.division);
		return division && names.includes(division) ? division : names[0];
	});

	const current = $derived(
		event.ok ? event.data.results.find((r) => r.division === active) : undefined
	);
</script>

{#if !event.ok}
	<PageHeader title="Results" back={{ href: backHref, label: 'All results' }} />
	<ServiceUnavailable
		title="These results are temporarily unavailable"
		message={event.message}
		testId="event-results-unavailable"
	/>
{:else}
	<PageHeader
		title={event.data.name}
		eyebrow="Results"
		back={{ href: backHref, label: 'All results' }}
	>
		{#snippet meta()}
			<span>{formatApiDateRange(event.data.startDate, event.data.endDate)}</span>
		{/snippet}
	</PageHeader>

	{#if event.data.results.length === 0}
		<EmptyState title="No results recorded for this event" size="compact" />
	{:else}
		{#if event.data.results.length > 1}
			<SegmentedTabs
				tabs={event.data.results.map((r) => ({
					label: r.division,
					href: divisionHref(r.division),
					match: [r.division],
					testid: `event-division-${r.division.replace(/\s+/g, '-').toLowerCase()}`
				}))}
				current={active ?? ''}
				label="Division"
				class="mb-6"
				data-testid="event-division-tabs"
			/>
		{/if}

		{#if current}
			<DivisionResults result={current} />
		{/if}
	{/if}
{/if}
