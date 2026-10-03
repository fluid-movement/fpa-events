<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import DividerLabel from '#lib/components/layout/DividerLabel.svelte';
	import EmptyState from '#lib/components/layout/EmptyState.svelte';
	import EventCalendarCard from '#lib/components/EventCalendarCard.svelte';
	import CountdownBadge from '#lib/components/CountdownBadge.svelte';
	import CalendarFeedPanel from '#lib/components/CalendarFeedPanel.svelte';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import { regenerateToken } from '#lib/api/calendar.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const calendarToken = $derived(regenerateToken.result?.calendarToken ?? data.calendarToken);
</script>

<PageShell>
	<PageHeader title="Attending" description="Events you've marked as attending." />

	<div class="space-y-8 md:space-y-12">
		<section>
			<DividerLabel label="Upcoming" class="mb-6" />

			{#if data.upcoming.length === 0}
				<EmptyState
					icon={HeartIcon}
					title="Nothing on the calendar yet"
					description="Find a jam or a competition and mark yourself as attending."
				>
					{#snippet action()}
						<Button href={resolve('/events')} variant="outline">Browse events</Button>
					{/snippet}
				</EmptyState>
			{:else}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
					{#each data.upcoming as event (event.id)}
						<div class="relative">
							<EventCalendarCard {event} />
							<div class="absolute top-3 right-3 z-10">
								<CountdownBadge startDate={event.startDate} />
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		{#if data.past.length > 0}
			<section>
				<DividerLabel label="Past" class="mb-6" />
				<div class="grid grid-cols-1 gap-4 opacity-60 sm:grid-cols-2 md:gap-6">
					{#each data.past as event (event.id)}
						<EventCalendarCard {event} />
					{/each}
				</div>
			</section>
		{/if}

		<section>
			<DividerLabel label="Calendar feed" class="mb-6" />
			<div class="surface rounded-xl p-5 md:p-6">
				<h2 class="mb-1">Subscribe to calendar</h2>
				<CalendarFeedPanel token={calendarToken} />
			</div>
		</section>
	</div>
</PageShell>
