<script lang="ts">
	import { resolve } from '$app/paths';
	import EventCalendarCard from '$lib/components/EventCalendarCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function daysUntil(date: Date): number {
		const now = new Date();
		const ms = new Date(date).getTime() - now.getTime();
		return Math.ceil(ms / (1000 * 60 * 60 * 24));
	}

	function countdownLabel(days: number): string {
		if (days === 0) return 'Today';
		if (days === 1) return 'Tomorrow';
		return `${days} days away`;
	}
</script>

<div class="space-y-2 pb-6">
	<h1>Attending</h1>
	<p class="text-muted-foreground">Events you've marked as attending.</p>
</div>

<!-- Upcoming -->
<section class="mb-12">
	<div class="flex items-center w-full mb-6">
		<div class="h-px w-full grow bg-border"></div>
		<span class="shrink mx-6 font-medium text-sm text-muted-foreground whitespace-nowrap">Upcoming</span>
		<div class="h-px w-full grow bg-border"></div>
	</div>

	{#if data.upcoming.length === 0}
		<div class="text-center py-10 text-muted-foreground">
			<p>No upcoming events. <a href={resolve('/events')} class="text-primary underline underline-offset-2">Browse events</a> to find one.</p>
		</div>
	{:else}
		<div class="grid gap-6 grid-cols-1 sm:grid-cols-2">
			{#each data.upcoming as event (event.id)}
				{@const days = daysUntil(event.startDate)}
				<div class="relative">
					<EventCalendarCard {event} />
					<div class="absolute top-3 right-3 z-10">
						<span class="text-xs font-semibold px-2 py-0.5 rounded-full
							{days <= 7
								? 'bg-primary/20 text-primary border border-primary/30'
								: 'bg-muted text-muted-foreground border border-border'}">
							{countdownLabel(days)}
						</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

<!-- Past -->
{#if data.past.length > 0}
	<section>
		<div class="flex items-center w-full mb-6">
			<div class="h-px w-full grow bg-border"></div>
			<span class="shrink mx-6 font-medium text-sm text-muted-foreground whitespace-nowrap">Past</span>
			<div class="h-px w-full grow bg-border"></div>
		</div>

		<div class="grid gap-6 grid-cols-1 sm:grid-cols-2 opacity-60">
			{#each data.past as event (event.id)}
				<EventCalendarCard {event} />
			{/each}
		</div>
	</section>
{/if}
