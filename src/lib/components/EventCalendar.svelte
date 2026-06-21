<script lang="ts">
	import type { EventsByMonth } from '$lib/server/utils/events';
	import EventCalendarCard from './EventCalendarCard.svelte';

	interface Props {
		eventsByMonth: EventsByMonth;
	}

	let { eventsByMonth }: Props = $props();
</script>

{#if eventsByMonth.length === 0}
	<div class="text-center py-16 text-muted-foreground">
		<p class="text-lg">No events found.</p>
	</div>
{:else}
	{#each eventsByMonth as { month, label, events } (month)}
		<section class="relative mb-10">
			<!-- Month header with divider lines -->
			<div class="sticky z-10 top-0 mb-8">
				<div class="flex items-center w-full">
					<div class="h-px w-full grow bg-border"></div>
					<span class="shrink mx-6 font-medium text-sm text-muted-foreground whitespace-nowrap">{label}</span>
					<div class="h-px w-full grow bg-border"></div>
				</div>
			</div>

			<!-- 2-column grid -->
			<div class="grid gap-6 grid-cols-1 items-stretch sm:grid-cols-2">
				{#each events as event (event.id)}
					<EventCalendarCard
						{event}
						attendeeCount={'attendeeCount' in event ? (event as { attendeeCount: number }).attendeeCount : undefined}
						userStatus={'userStatus' in event ? (event as { userStatus: 'attending' | 'organizing' | null }).userStatus : undefined}
					/>
				{/each}
			</div>
		</section>
	{/each}
{/if}
