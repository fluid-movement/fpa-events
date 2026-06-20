<script lang="ts">
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import EventCalendarCard from '$lib/components/EventCalendarCard.svelte';
	import { daysUntil, countdownLabel } from '$lib/utils/dates';
	import { regenerateToken } from './data.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const calendarToken = $derived(regenerateToken.result?.calendarToken ?? data.calendarToken);

	let copied = $state(false);
	let regenerating = $state(false);
	let confirmRegenerate = $state(false);

	$effect(() => {
		if (regenerateToken.result?.calendarToken) regenerating = false;
	});

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
	<section class="mb-12">
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

<!-- Calendar Feed -->
<section>
	<div class="flex items-center w-full mb-6">
		<div class="h-px w-full grow bg-border"></div>
		<span class="shrink mx-6 font-medium text-sm text-muted-foreground whitespace-nowrap">Calendar Feed</span>
		<div class="h-px w-full grow bg-border"></div>
	</div>

	<div class="bg-card border border-border rounded-xl p-6 space-y-4">
		<div class="space-y-1">
			<h2 class="text-base font-semibold">Subscribe to Calendar</h2>
			<p class="text-sm text-muted-foreground">Add your attending events to Google Calendar, Apple Calendar, or any app that supports ICS subscriptions. The feed updates automatically.</p>
		</div>

		{#if browser && feedUrl}
			<div class="flex gap-2">
				<input
					type="text"
					readonly
					value={feedUrl}
					class="flex-1 min-w-0 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm font-mono text-muted-foreground truncate focus:outline-none"
				/>
				<button
					type="button"
					onclick={copyFeedUrl}
					class="shrink-0 rounded-md border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
				>
					{copied ? 'Copied!' : 'Copy'}
				</button>
			</div>

			<button
				type="button"
				onclick={openGoogleCalendar}
				class="inline-flex items-center gap-2 rounded-md border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
			>
				Add to Google Calendar
			</button>
		{/if}

		<div class="pt-2">
			{#if !confirmRegenerate}
				<button
					type="button"
					onclick={() => (confirmRegenerate = true)}
					class="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
				>
					Regenerate link
				</button>
			{:else}
				<div class="flex items-center gap-3">
					<p class="text-xs text-muted-foreground">This will invalidate the current link. Continue?</p>
					<form
						{...regenerateToken}
						onsubmit={() => {
							regenerating = true;
							confirmRegenerate = false;
						}}
					>
						<button
							type="submit"
							disabled={regenerating}
							class="text-xs text-destructive hover:text-destructive/80 underline underline-offset-2 transition-colors disabled:opacity-50"
						>
							{regenerating ? 'Regenerating…' : 'Yes, regenerate'}
						</button>
					</form>
					<button
						type="button"
						onclick={() => (confirmRegenerate = false)}
						class="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
					>
						Cancel
					</button>
				</div>
			{/if}
		</div>
	</div>
</section>
