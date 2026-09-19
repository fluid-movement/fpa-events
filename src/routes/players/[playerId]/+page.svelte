<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PlayerProfilePanel from '#lib/components/results/PlayerProfilePanel.svelte';

	const playerId = $derived(page.params.playerId!);
	const backHref = resolve('/results');
</script>

<svelte:head>
	<title>Player · FPA Events</title>
</svelte:head>

<PageShell width="content">
	<!-- Header included, for the same reason as the event page: the name arrives
	     with the fetch. -->
	<PlayerProfilePanel {playerId} {backHref} />
</PageShell>
