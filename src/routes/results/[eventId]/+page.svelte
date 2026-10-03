<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import EventResultsPanel from '#lib/components/results/EventResultsPanel.svelte';

	const eventId = $derived(page.params.eventId!);
	const division = $derived(page.url.searchParams.get('division') ?? undefined);

	const backHref = resolve('/results');

	const divisionHref = (value: string) =>
		`${resolve('/results/[eventId]', { eventId: eventId })}?division=${encodeURIComponent(value)}`;
</script>

<svelte:head>
	<title>Event results · FPA Events</title>
</svelte:head>

<PageShell width="content">
	<!-- The panel owns the header as well as the body: the event name is only
	     known once the fetch resolves, and rendering a placeholder title above a
	     loaded one would make the page jump. See /rankings for why this awaits
	     rather than sitting behind a boundary. -->
	<EventResultsPanel {eventId} {division} {backHref} {divisionHref} />
</PageShell>
