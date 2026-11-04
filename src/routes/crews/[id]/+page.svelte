<script lang="ts">
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<PageShell>
	<PageHeader title={data.crew.name} description={`${data.crew.city}, ${data.crew.country}`} />
</PageShell>
