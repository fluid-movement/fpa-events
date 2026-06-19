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
	const schedules = $derived(data.schedules);
	const attendeeCount = $derived(data.attendeeCount);

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
		// Check same month/year
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
</script>

<svelte:boundary>
	{#if event}
		<div class="max-w-4xl mx-auto">
			<div class="mb-4">
				<Button href={resolve('/events')} variant="ghost" size="sm">
					<ArrowLeftIcon class="size-4" />
					All Events
				</Button>
			</div>

			<!-- 2-col header: info left, image right -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 mb-8">
				<!-- Left: title + meta + description -->
				<div class="flex flex-col gap-3">
					<div class="flex items-start justify-between gap-4">
						<h1 class="text-3xl font-bold leading-tight">{event.name}</h1>
						{#if userId === event.userId}
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
					{#if userId}
						<form
							{...toggleRsvp}
							onsubmit={() => {
								attending = !attending;
								optimisticCount += attending ? 1 : -1;
							}}
						>
							<button
								type="submit"
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
							class="flex items-center gap-2 text-sm rounded-md px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors w-fit"
						>
							<HeartIcon class="size-4 shrink-0" />
							Attend · {optimisticCount}
						</a>
					{/if}
				</div>

				<!-- Right: image -->
				{#if event.picture}
					<div class="w-full">
						<img
							src={event.picture}
							alt={event.name}
							width={event.pictureWidth ?? undefined}
							height={event.pictureHeight ?? undefined}
							class="w-full rounded-lg object-cover max-h-56"
						/>
					</div>
				{/if}
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
						<div class="rounded-lg border bg-card p-4">
							<div class="flex items-start justify-between gap-4">
								<div class="min-w-0">
									<p class="font-semibold">{item.name}</p>
									{#if item.description}
										<p class="mt-1 text-sm text-muted-foreground">{item.description}</p>
									{/if}
									{#if item.location}
										<p class="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
											<MapPinIcon class="size-3.5 shrink-0" />
											{item.location}
										</p>
									{/if}
								</div>
								<div class="shrink-0 text-right text-sm text-muted-foreground">
									<p class="flex items-center gap-1.5 justify-end">
										<ClockIcon class="size-3.5" />
										{formatScheduleTime(item.startDate)}
									</p>
									{#if item.startDate.toString() !== item.endDate.toString()}
										<p class="mt-0.5 text-xs">→ {formatScheduleTime(item.endDate)}</p>
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
