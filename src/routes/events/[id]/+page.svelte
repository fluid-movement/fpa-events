<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { toggleRsvp } from './data.remote';
	import type { PageProps } from './$types';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ClockIcon from '@lucide/svelte/icons/clock';

	let { data }: PageProps = $props();
	const event = $derived(data.event);
	const userId = $derived(data.userId);
	const userRole = $derived(data.userRole);
	const schedules = $derived(data.schedules);
	const attendeePeek = $derived(data.attendeePeek);
	const canManage = $derived(userId === event.userId || userRole === 'admin');

	let attending = $state(data.userAttending);
	let optimisticCount = $state(data.attendeeCount);

	$effect(() => {
		attending = data.userAttending;
		optimisticCount = data.attendeeCount;
	});

	let activeTab = $state<'description' | 'schedule'>('description');

	function formatDateRange(start: Date, end: Date) {
		const sameDay = start.toDateString() === end.toDateString();
		if (sameDay) {
			return start.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
		}
		if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
			return `${start.getDate()} - ${end.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`;
		}
		const startStr = start.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
		const endStr = end.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
		return `${startStr} - ${endStr}`;
	}

	function formatScheduleTime(d: Date) {
		return new Date(d).toLocaleString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	const dateRange = $derived(formatDateRange(new Date(event.startDate), new Date(event.endDate)));

	const attendeePeekLabel = $derived.by(() => {
		if (optimisticCount === 0) return null;
		const names = attendeePeek.map((a) => a.name.split(' ')[0]);
		const shown = names.slice(0, 3);
		const rest = optimisticCount - shown.length;
		if (rest > 0) return `${shown.join(', ')} and ${rest} other${rest === 1 ? '' : 's'} attending`;
		if (shown.length === 1) return `${shown[0]} is attending`;
		return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]} are attending`;
	});
</script>

<svelte:boundary>
	{#if event}
		<div class="max-w-4xl mx-auto">
			<!-- Cover image hero -->
			{#if event.picture}
				<div class="relative w-full mb-6 rounded-xl overflow-hidden">
					<img
						src={event.picture}
						alt={event.name}
						width={event.pictureWidth ?? undefined}
						height={event.pictureHeight ?? undefined}
						class="w-full object-cover max-h-80"
					/>
					<!-- Gradient overlay for readability -->
					<div class="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent"></div>
				</div>
			{/if}

			<div class="mb-4">
				<Button href={resolve('/events')} variant="ghost" size="sm">
					<ArrowLeftIcon class="size-4" />
					All Events
				</Button>
			</div>

			<!-- Header: title + meta -->
			<div class="flex flex-col gap-3 mb-8">
				<div class="flex items-start justify-between gap-4">
					<h1 class="text-3xl font-bold leading-tight">{event.name}</h1>
					{#if canManage}
						<div class="flex gap-2 shrink-0">
							<Button href={resolve(`/events/${event.id}/edit`)} variant="outline" size="sm">
								<PencilIcon class="size-4" />
								Edit
							</Button>
							<Button href={resolve(`/events/${event.id}/admin`)} variant="outline" size="sm">
								Manage
							</Button>
						</div>
					{/if}
				</div>

				<p class="flex items-center gap-2 text-muted-foreground">
					<CalendarIcon class="size-4 shrink-0" />
					{dateRange}
				</p>
				<p class="flex items-center gap-2 text-muted-foreground">
					<MapPinIcon class="size-4 shrink-0" />
					{event.location}
				</p>

				<!-- RSVP + attendee peek -->
				<div class="flex flex-col gap-2">
					{#if userId}
						<form {...toggleRsvp}>
							<button
								type="submit"
								data-testid="rsvp-button"
								onclick={() => {
									attending = !attending;
									optimisticCount += attending ? 1 : -1;
								}}
								class="flex items-center gap-2 text-sm rounded-md px-3 py-1.5 border transition-colors {attending
									? 'bg-primary/15 border-primary/40 text-primary hover:bg-primary/20'
									: 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'}"
							>
								<HeartIcon class="size-4 shrink-0 {attending ? 'fill-primary' : ''}" />
								{#if attending}
									Attending · {optimisticCount}
								{:else}
									Attend · {optimisticCount}
								{/if}
							</button>
						</form>
					{:else}
						<a
							href={resolve('/sign-in')}
							data-testid="rsvp-sign-in-link"
							class="flex items-center gap-2 text-sm rounded-md px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors w-fit"
						>
							<HeartIcon class="size-4 shrink-0" />
							Attend · {optimisticCount}
						</a>
					{/if}
					{#if attendeePeekLabel}
						<p class="text-xs text-muted-foreground pl-0.5">{attendeePeekLabel}</p>
					{/if}
				</div>
			</div>

			<!-- Tabs (only if schedules exist) -->
			{#if schedules.length > 0}
				<div class="mb-6 flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
					<button
						onclick={() => (activeTab = 'description')}
						class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {activeTab === 'description' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
					>
						Description
					</button>
					<button
						onclick={() => (activeTab = 'schedule')}
						class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {activeTab === 'schedule' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
					>
						Schedule
					</button>
				</div>
			{/if}

			<!-- Tab content -->
			{#if activeTab === 'description'}
				{#if event.description}
					<div class="rich-text text-base text-foreground/90">{@html event.description}</div>
				{:else}
					<p class="text-muted-foreground">No description provided.</p>
				{/if}
			{:else if activeTab === 'schedule'}
				<div class="space-y-3">
					{#each schedules as item (item.id)}
						<div class="rounded-xl border bg-card p-5">
							<div class="flex items-start justify-between gap-4">
								<div class="min-w-0">
									<p class="font-semibold text-base">{item.name}</p>
									{#if item.description}
										<p class="mt-1 text-sm text-muted-foreground">{item.description}</p>
									{/if}
									{#if item.locationName}
										<p class="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
											<MapPinIcon class="size-3.5 shrink-0" />
											{item.locationName}
										</p>
									{/if}
								</div>
								<div class="shrink-0 text-right">
									<p class="flex items-center gap-1.5 justify-end text-sm font-medium text-foreground/80">
										<ClockIcon class="size-3.5 text-primary" />
										{formatScheduleTime(item.startDate)}
									</p>
									{#if item.startDate.toString() !== item.endDate.toString()}
										<p class="mt-1 text-xs text-muted-foreground">→ {formatScheduleTime(item.endDate)}</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<div class="text-center py-16 text-muted-foreground">
			<p class="text-lg">Event not found.</p>
			<Button href={resolve('/events')} variant="link">Back to Events</Button>
		</div>
	{/if}
</svelte:boundary>
