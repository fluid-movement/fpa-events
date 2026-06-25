<script lang="ts">
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import { client } from '$lib/auth-client';
	import { daysUntil, countdownLabel, formatDateRange } from '$lib/utils/dates';
	import { regenerateToken } from './data.remote';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Separator } from '$lib/components/ui/separator';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import UsersIcon from '@lucide/svelte/icons/users';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const session = client.useSession();

	const calendarToken = $derived(
		regenerateToken.result?.calendarToken ?? data.attending.calendarToken
	);

	let calendarOpen = $state(false);
	let copied = $state(false);
	let regenerating = $state(false);
	let confirmRegenerate = $state(false);

	const isRegenerating = $derived(regenerating && !regenerateToken.result?.calendarToken);

	const feedUrl = $derived(
		browser ? `${window.location.origin}/api/calendar/${calendarToken}/feed.ics` : ''
	);

	const googleCalendarUrl = $derived(
		browser
			? `https://www.google.com/calendar/render?cid=webcal://${window.location.host}/api/calendar/${calendarToken}/feed.ics`
			: ''
	);

	async function copyFeedUrl() {
		if (!feedUrl) return;
		await navigator.clipboard.writeText(feedUrl);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}

	function openGoogleCalendar() {
		window.open(googleCalendarUrl, '_blank', 'noopener,noreferrer');
	}

	const greeting = $derived.by(() => {
		const h = new Date().getHours();
		if (h < 12) return 'Good morning';
		if (h < 17) return 'Good afternoon';
		return 'Good evening';
	});

	const userName = $derived($session.data?.user.name ?? '');
</script>

<!-- Welcome header -->
<div class="mb-8 flex flex-wrap items-start justify-between gap-4">
	<div>
		<h1 class="text-2xl font-bold">{greeting}{userName ? `, ${userName}` : ''}</h1>
		<p class="mt-1 text-muted-foreground">Here's what's happening with your events.</p>
	</div>
	<div class="flex flex-wrap gap-2">
		<Badge variant="secondary">
			<CalendarIcon class="mr-1.5 size-3.5" />
			{data.attending.upcoming.length} attending
		</Badge>
		<Badge variant="secondary">
			<UsersIcon class="mr-1.5 size-3.5" />
			{data.organizing.upcoming.length} organizing
		</Badge>
	</div>
</div>

<!-- Main layout -->
<div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
	<!-- Left column: Attending -->
	<div class="space-y-6 lg:col-span-2">
		<!-- Attending card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Attending</Card.Title>
				<Card.Description>Events you're going to.</Card.Description>
				<Card.Action>
					<Button variant="ghost" size="sm" onclick={() => (calendarOpen = true)}>Calendar</Button>
					<Button href={resolve('/attending')} variant="ghost" size="sm">View all</Button>
				</Card.Action>
			</Card.Header>
			<Card.Content>
				{#if data.attending.upcoming.length === 0}
					<div class="py-8 text-center text-muted-foreground">
						<p class="mb-3">You're not attending any upcoming events.</p>
						<Button href={resolve('/events')} variant="outline" size="sm">Browse events</Button>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-2">
						{#each data.attending.upcoming.slice(0, 4) as event (event.id)}
							{@const days = daysUntil(event.startDate)}
							{@const start = new Date(event.startDate)}
							{@const startDay = String(start.getDate()).padStart(2, '0')}
							{@const startMonth = start.toLocaleDateString('en-US', { month: 'short' })}
							{@const dateRange = formatDateRange(event.startDate, event.endDate)}
							<a
								href={resolve(`/events/${event.id}`)}
								class="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 transition-colors hover:bg-muted/50"
							>
								<div class="flex shrink-0 flex-col items-center justify-center rounded-md bg-primary px-2.5 py-1.5 text-primary-foreground">
									<span class="text-lg font-black leading-none">{startDay}</span>
									<span class="text-[0.6rem] font-bold uppercase tracking-wide opacity-80">{startMonth}</span>
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate font-semibold leading-tight">{event.name}</p>
									<p class="mt-0.5 text-xs text-muted-foreground whitespace-nowrap">{dateRange}</p>
								</div>
								<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold
									{days <= 7
										? 'border border-primary/30 bg-primary/20 text-primary'
										: 'border border-border bg-muted text-muted-foreground'}">
									{countdownLabel(days)}
								</span>
							</a>
						{/each}
					</div>
					{#if data.attending.upcoming.length > 4}
						<div class="mt-4">
							<Button href={resolve('/attending')} variant="ghost" size="sm">
								View all {data.attending.upcoming.length} upcoming events →
							</Button>
						</div>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>

	</div>

	<Dialog.Root bind:open={calendarOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Calendar Feed</Dialog.Title>
				<Dialog.Description>
					Subscribe to your attending events in Google Calendar, Apple Calendar, or any
					ICS-compatible app. Updates automatically.
				</Dialog.Description>
			</Dialog.Header>
			<div class="space-y-4">
				{#if browser && feedUrl}
					<div class="flex gap-2">
						<input
							type="text"
							readonly
							value={feedUrl}
							class="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-sm text-muted-foreground focus:outline-none"
						/>
						<Button variant="outline" size="sm" onclick={copyFeedUrl}>
							{copied ? 'Copied!' : 'Copy'}
						</Button>
					</div>

					<Button variant="outline" size="sm" onclick={openGoogleCalendar}>
						Add to Google Calendar
					</Button>
				{/if}

				<div class="pt-1">
					{#if !confirmRegenerate}
						<button
							type="button"
							onclick={() => (confirmRegenerate = true)}
							class="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
						>
							Regenerate link
						</button>
					{:else}
						<div class="flex items-center gap-3">
							<p class="text-xs text-muted-foreground">
								This will invalidate the current link. Continue?
							</p>
							<form
								{...regenerateToken}
								onsubmit={() => {
									regenerating = true;
									confirmRegenerate = false;
								}}
							>
								<button
									type="submit"
									disabled={isRegenerating}
									class="text-xs text-destructive underline underline-offset-2 transition-colors hover:text-destructive/80 disabled:opacity-50"
								>
									{isRegenerating ? 'Regenerating…' : 'Yes, regenerate'}
								</button>
							</form>
							<button
								type="button"
								onclick={() => (confirmRegenerate = false)}
								class="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
							>
								Cancel
							</button>
						</div>
					{/if}
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Right column: Organizing -->
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
					<div class="py-8 text-center text-muted-foreground">
						<p class="mb-3 text-sm">No upcoming events.</p>
						<Button href={resolve('/events/create')} variant="outline" size="sm"
							>Create Event</Button
						>
					</div>
				{:else}
					<div class="space-y-0">
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
								<div class="flex gap-1.5 pt-0.5">
									<Button href={resolve(`/events/${event.id}`)} variant="outline" size="xs"
										>View</Button
									>
									<Button href={resolve(`/events/${event.id}/admin`)} size="xs">Admin</Button>
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
									: 's'} →
							</Button>
						</div>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
