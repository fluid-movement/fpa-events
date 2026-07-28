<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/auth-client';
	import { formatDateRange } from '$lib/utils/dates';
	import { regenerateToken } from '$lib/api/calendar.remote';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Separator } from '$lib/components/ui/separator';
	import PageShell from '$lib/components/layout/PageShell.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import EmptyState from '$lib/components/layout/EmptyState.svelte';
	import CountdownBadge from '$lib/components/CountdownBadge.svelte';
	import CalendarFeedPanel from '$lib/components/CalendarFeedPanel.svelte';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import UsersIcon from '@lucide/svelte/icons/users';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const session = client.useSession();

	const calendarToken = $derived(
		regenerateToken.result?.calendarToken ?? data.attending.calendarToken
	);

	let calendarOpen = $state(false);

	const greeting = $derived.by(() => {
		const h = new Date().getHours();
		if (h < 12) return 'Good morning';
		if (h < 17) return 'Good afternoon';
		return 'Good evening';
	});

	const userName = $derived($session.data?.user.name ?? '');
</script>

<PageShell>
	<PageHeader
		title="{greeting}{userName ? `, ${userName}` : ''}"
		description="Here's what's happening with your events."
	>
		{#snippet actions()}
			<Badge variant="secondary">
				<CalendarIcon data-icon="inline-start" />
				{data.attending.upcoming.length} attending
			</Badge>
			<Badge variant="secondary">
				<UsersIcon data-icon="inline-start" />
				{data.organizing.upcoming.length} organizing
			</Badge>
		{/snippet}
	</PageHeader>

	<!-- Single column until there's genuinely room for two: the right-hand card is
	     a summary, so it belongs under the main list on anything narrower. -->
	<div class="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
		<div class="space-y-4 md:space-y-6 lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Attending</Card.Title>
					<Card.Description>Events you're going to.</Card.Description>
					<Card.Action>
						<Button variant="ghost" size="sm" onclick={() => (calendarOpen = true)}>Calendar</Button
						>
						<Button href={resolve('/attending')} variant="ghost" size="sm">View all</Button>
					</Card.Action>
				</Card.Header>
				<Card.Content>
					{#if data.attending.upcoming.length === 0}
						<EmptyState icon={HeartIcon} title="Nothing on the calendar yet" size="compact">
							{#snippet action()}
								<Button href={resolve('/events')} variant="outline" size="sm">Browse events</Button>
							{/snippet}
						</EmptyState>
					{:else}
						<div class="grid grid-cols-1 gap-2">
							{#each data.attending.upcoming.slice(0, 4) as event (event.id)}
								{@const start = new Date(event.startDate)}
								{@const startDay = String(start.getDate()).padStart(2, '0')}
								{@const startMonth = start.toLocaleDateString('en-US', { month: 'short' })}
								<a
									href={resolve(`/events/${event.id}`)}
									class="surface-row flex items-center gap-3 rounded-lg p-3"
								>
									<div
										class="flex shrink-0 flex-col items-center justify-center rounded-md bg-primary px-2.5 py-1.5 text-primary-foreground"
									>
										<span class="text-lg leading-none font-black">{startDay}</span>
										<span class="text-[0.6rem] font-bold tracking-wide uppercase opacity-80">
											{startMonth}
										</span>
									</div>
									<div class="min-w-0 flex-1">
										<p class="truncate leading-tight font-semibold">{event.name}</p>
										<p class="mt-0.5 truncate text-xs text-muted-foreground">
											{formatDateRange(event.startDate, event.endDate)}
										</p>
									</div>
									<CountdownBadge startDate={event.startDate} class="shrink-0" />
								</a>
							{/each}
						</div>
						{#if data.attending.upcoming.length > 4}
							<div class="mt-4">
								<Button href={resolve('/attending')} variant="ghost" size="sm">
									View all {data.attending.upcoming.length} upcoming events
									<ArrowRightIcon />
								</Button>
							</div>
						{/if}
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<div>
			<Card.Root>
				<Card.Header>
					<Card.Title>Organizing</Card.Title>
					<Card.Description>Events you're running.</Card.Description>
					<Card.Action>
						<Button href={resolve('/events/create')} size="sm">Create</Button>
					</Card.Action>
				</Card.Header>
				<Card.Content>
					{#if data.organizing.upcoming.length === 0}
						<EmptyState icon={ClipboardListIcon} title="No upcoming events" size="compact">
							{#snippet action()}
								<Button href={resolve('/events/create')} variant="outline" size="sm">
									Create event
								</Button>
							{/snippet}
						</EmptyState>
					{:else}
						<div>
							{#each data.organizing.upcoming as event, i (event.id)}
								{#if i > 0}
									<Separator class="my-4" />
								{/if}
								<div class="space-y-2">
									<p class="leading-tight font-semibold">{event.name}</p>
									<div class="flex flex-col gap-0.5 text-xs text-muted-foreground">
										<span class="flex items-center gap-1.5">
											<CalendarIcon class="size-3 shrink-0" />
											{formatDateRange(event.startDate, event.endDate)}
										</span>
										<span class="flex items-center gap-1.5">
											<MapPinIcon class="size-3 shrink-0" />
											{event.location}
										</span>
										<span class="flex items-center gap-1.5">
											<UsersIcon class="size-3 shrink-0" />
											{event.attendeeCount} attending
										</span>
									</div>
									<!-- sm, not xs: these are the primary actions on a phone. -->
									<div class="flex gap-2 pt-0.5">
										<Button href={resolve(`/events/${event.id}`)} variant="outline" size="sm">
											View
										</Button>
										<Button href={resolve(`/events/${event.id}/admin`)} size="sm">Manage</Button>
									</div>
								</div>
							{/each}
						</div>
						{#if data.organizing.past.length > 0}
							<div class="mt-4 border-t border-border pt-4">
								<Button
									href={resolve('/organizing')}
									variant="ghost"
									size="sm"
									class="w-full text-muted-foreground"
								>
									View {data.organizing.past.length} past event{data.organizing.past.length === 1
										? ''
										: 's'}
									<ArrowRightIcon />
								</Button>
							</div>
						{/if}
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</PageShell>

<Dialog.Root bind:open={calendarOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Calendar feed</Dialog.Title>
			<Dialog.Description>
				Subscribe to your attending events in any ICS-compatible calendar app.
			</Dialog.Description>
		</Dialog.Header>
		<CalendarFeedPanel token={calendarToken} />
	</Dialog.Content>
</Dialog.Root>
