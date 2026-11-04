<script lang="ts">
	import { onMount } from 'svelte';
	import { nextJam } from '#lib/crew-jams';
	import { formatNextJam } from '#lib/utils/dates';
	import { resolve } from '$app/paths';
	import CrewsMap from '#lib/components/CrewsMap.svelte';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import EmptyState from '#lib/components/layout/EmptyState.svelte';
	import { Button } from '#lib/components/ui/button';
	import * as Card from '#lib/components/ui/card';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	// No coordinate-to-zone lookup exists; compute in the viewer's local zone after hydration.
	let viewerNow = $state<Date | null>(null);
	onMount(() => {
		viewerNow = new Date();
	});
</script>

<PageShell class="flex flex-col gap-6">
	<PageHeader title="Crews" description="Find your local freestyle community.">
		{#snippet actions()}
			<Button href={resolve('/crews/create')}>Start a crew</Button>
		{/snippet}
	</PageHeader>
	{#if data.crews.length > 0}
		{#key data.crews}<CrewsMap crews={data.crews} />{/key}
		<div class="grid gap-4 sm:grid-cols-2" data-testid="crew-list">
			{#each data.crews as crew (crew.id)}
				{@const upcomingJam = viewerNow ? nextJam(crew.jams, viewerNow) : undefined}
				<a href={resolve('/crews/[id]', { id: crew.id })} data-testid="crew-card">
					<Card.Root class="h-full">
						<Card.Header>
							<Card.Title>{crew.name}</Card.Title>
							<Card.Description>{crew.city}, {crew.country}</Card.Description>
						</Card.Header>
						<Card.Content>
							<p>{crew.memberCount} {crew.memberCount === 1 ? 'member' : 'members'}</p>
							{#if upcomingJam}<p data-testid="crew-next-jam">
									Next jam: {formatNextJam(upcomingJam)}
								</p>{/if}
						</Card.Content>
					</Card.Root>
				</a>
			{/each}
		</div>
		<EmptyState
			size="compact"
			title="No crew in your city yet?"
			description="Bring your local players together and start the crew for your city."
		>
			{#snippet action()}<Button href={resolve('/crews/create')} variant="outline"
					>Start your city's crew</Button
				>{/snippet}
		</EmptyState>
	{:else}
		<div data-testid="crews-empty">
			<EmptyState
				title="Start the first crew"
				description="Bring your local players together and start the crew for your city."
			>
				{#snippet action()}<Button href={resolve('/crews/create')}>Start your city's crew</Button
					>{/snippet}
			</EmptyState>
		</div>
	{/if}
</PageShell>
