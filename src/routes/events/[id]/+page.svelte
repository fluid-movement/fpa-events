<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import ScheduleList from '$lib/components/schedule/ScheduleList.svelte';
	import RichContent from '$lib/components/RichContent.svelte';
	import { toggleRsvp } from './data.remote';
	import type { PageProps } from './$types';
	import { formatDateRange } from '$lib/utils/dates';
	import * as Dialog from '$lib/components/ui/dialog';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import StarIcon from '@lucide/svelte/icons/star';
	import UserIcon from '@lucide/svelte/icons/user';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	let { data }: PageProps = $props();
	const event = $derived(data.event);
	const userId = $derived(data.userId);
	const userRole = $derived(data.userRole);
	const schedules = $derived(data.schedules);
	const attendeePeek = $derived(data.attendeePeek);
	const canManage = $derived(userId === event.userId || userRole === 'admin');

	let attending = $state(false);
	let optimisticCount = $state(0);
	let showAttendeesModal = $state(false);
	const allAttendees = $derived(data.allAttendees);

	$effect(() => {
		attending = data.userStatus === 'attending';
		optimisticCount = data.attendeeCount;
	});

	const dateRange = $derived(formatDateRange(new Date(event.startDate), new Date(event.endDate)));
	const isPast = $derived(new Date(event.startDate) < new Date());

	const attendeePeekLabel = $derived.by(() => {
		if (optimisticCount === 0) return null;
		const names = attendeePeek.map((a) => a.name.split(' ')[0]);
		const shown = names.slice(0, 3);
		const rest = optimisticCount - shown.length;
		if (rest > 0) return `${shown.join(', ')} and ${rest} other${rest === 1 ? '' : 's'} ${isPast ? 'attended' : 'attending'}`;
		if (shown.length === 1) return isPast ? `${shown[0]} attended` : `${shown[0]} is attending`;
		return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]} ${isPast ? 'attended' : 'are attending'}`;
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
					<div class="absolute inset-0 bg-linear-to-t from-background/60 via-transparent to-transparent"></div>
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
					{#if data.userStatus === 'organizing'}
						<div class="flex items-center gap-2">
							<Badge variant="secondary" data-testid="organizing-badge">
								<StarIcon data-icon="inline-start" />
								Organizing
							</Badge>
						</div>
					{:else if !isPast}
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
					{/if}
					{#if attendeePeekLabel}
						<button
							class="flex items-center gap-1 text-xs text-muted-foreground pl-0.5 text-left underline underline-offset-2 cursor-pointer"
							onclick={() => (showAttendeesModal = true)}
						>
							{attendeePeekLabel}
							<ChevronRightIcon class="size-3 shrink-0" />
						</button>
					{/if}
				</div>
			</div>

			<Dialog.Root bind:open={showAttendeesModal}>
				<Dialog.Content class="max-w-sm">
					<Dialog.Header>
						<Dialog.Title>{isPast ? 'Who attended' : 'Attendees'}</Dialog.Title>
					</Dialog.Header>
					<ul class="flex flex-col gap-3 py-2 max-h-96 overflow-y-auto">
						{#each allAttendees as attendee}
							<li class="flex items-center gap-3">
								{#if attendee.image}
									<img src={attendee.image} alt={attendee.name} class="size-8 rounded-full object-cover shrink-0" />
								{:else}
									<div class="bg-primary/10 rounded-full p-1.5 shrink-0">
										<UserIcon class="size-4 text-primary" />
									</div>
								{/if}
								<span class="text-sm">{attendee.name}</span>
							</li>
						{/each}
					</ul>
				</Dialog.Content>
			</Dialog.Root>

			<!-- Tabs (only if schedules exist) -->
			{#if schedules.length > 0}
				<Tabs.Root value="description">
					<Tabs.List>
						<Tabs.Trigger value="description">Description</Tabs.Trigger>
						<Tabs.Trigger value="schedule">Schedule</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Content value="description">
						{#if event.description}
							<RichContent content={event.description} class="text-base text-foreground/90" />
						{:else}
							<p class="text-muted-foreground">No description provided.</p>
						{/if}
					</Tabs.Content>
					<Tabs.Content value="schedule">
						<ScheduleList {schedules} />
					</Tabs.Content>
				</Tabs.Root>
			{:else}
				{#if event.description}
					<RichContent content={event.description} class="text-base text-foreground/90" />
				{:else}
					<p class="text-muted-foreground">No description provided.</p>
				{/if}
			{/if}
		</div>
	{:else}
		<div class="text-center py-16 text-muted-foreground">
			<p class="text-lg">Event not found.</p>
			<Button href={resolve('/events')} variant="link">Back to Events</Button>
		</div>
	{/if}
</svelte:boundary>
