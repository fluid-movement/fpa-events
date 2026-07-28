<script lang="ts">
	import type { EventsByMonth } from '$lib/server/utils/events';
	import EventCalendarCard from './EventCalendarCard.svelte';
	import DividerLabel from './layout/DividerLabel.svelte';
	import EmptyState from './layout/EmptyState.svelte';
	import CalendarIcon from '@lucide/svelte/icons/calendar';

	interface Props {
		eventsByMonth: EventsByMonth;
	}

	let { eventsByMonth }: Props = $props();
</script>

{#if eventsByMonth.length === 0}
	<EmptyState
		icon={CalendarIcon}
		title="No events found"
		description="Nothing scheduled here yet — check back soon."
	/>
{:else}
	{#each eventsByMonth as { month, label, events } (month)}
		<section class="relative mb-8 md:mb-10">
			<!-- Offset on mobile so the month never slides under the sticky top bar,
			     and backed so cards don't scroll through the label. -->
			<div class="sticky top-14 z-10 mb-6 bg-background/90 py-2 backdrop-blur-sm md:top-0 md:mb-8">
				<DividerLabel {label} />
			</div>

			<div class="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:gap-6">
				{#each events as event (event.id)}
					<EventCalendarCard
						{event}
						attendeeCount={'attendeeCount' in event
							? (event as { attendeeCount: number }).attendeeCount
							: undefined}
						userStatus={'userStatus' in event
							? (event as { userStatus: 'attending' | 'organizing' | null }).userStatus
							: undefined}
					/>
				{/each}
			</div>
		</section>
	{/each}
{/if}
