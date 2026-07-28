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
	import { attendeeSummary, firstName } from '$lib/utils/attendees';
	import * as Dialog from '$lib/components/ui/dialog';
	import PageShell from '$lib/components/layout/PageShell.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import EmptyState from '$lib/components/layout/EmptyState.svelte';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import StarIcon from '@lucide/svelte/icons/star';
	import UserIcon from '@lucide/svelte/icons/user';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	let { data }: PageProps = $props();
	const event = $derived(data.event);
	const userId = $derived(data.userId);
	const userRole = $derived(data.userRole);
	const schedules = $derived(data.schedules);
	const attendeePeek = $derived(data.attendeePeek);
	// Co-organizers who accepted a magic-link invite manage the event too.
	const canManage = $derived(
		userId === event.userId || userRole === 'admin' || data.userStatus === 'organizing'
	);

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

	const attendeePeekLabel = $derived(
		attendeeSummary(
			attendeePeek.map((a) => firstName(a.name)),
			optimisticCount,
			isPast
		)
	);

	// Attendees who opted out of being named are still counted in the total.
	const hiddenAttendeeCount = $derived(Math.max(0, optimisticCount - allAttendees.length));
</script>

<!-- No `pending` snippet: `event`/`schedules`/etc. are all resolved by the SSR
     load in +page.server.ts, so nothing inside this boundary suspends — a
     pending skeleton would never render. Same tradeoff as the boundary-less
     rankings page (src/routes/rankings/+page.svelte:80-91). `failed` still
     earns its keep: it catches a runtime error thrown while rendering the
     `{#if event}` branch instead of an unhandled crash. -->
<svelte:boundary>
	{#snippet failed(error, reset)}
		<PageShell width="content">
			<EmptyState
				icon={TriangleAlertIcon}
				title="Something went wrong"
				description={error instanceof Error ? error.message : 'An unexpected error occurred.'}
			>
				{#snippet action()}
					<Button onclick={reset} variant="outline">Try again</Button>
				{/snippet}
			</EmptyState>
		</PageShell>
	{/snippet}
	{#if event}
		<PageShell width="content">
			<!-- Cover image hero -->
			{#if event.picture}
				<div class="relative mb-6 w-full overflow-hidden rounded-xl">
					<img
						src={event.picture}
						alt={event.name}
						width={event.pictureWidth ?? undefined}
						height={event.pictureHeight ?? undefined}
						class="max-h-56 w-full object-cover md:max-h-80"
					/>
					<!-- Gradient overlay for readability -->
					<div
						class="absolute inset-0 bg-linear-to-t from-background/60 via-transparent to-transparent"
					></div>
				</div>
			{/if}

			<PageHeader
				title={event.name}
				back={{ href: resolve('/events'), label: 'All events' }}
				class="pb-4"
			>
				{#snippet meta()}
					<span class="flex items-center gap-2">
						<CalendarIcon class="size-4 shrink-0" />
						{dateRange}
					</span>
					<span class="flex items-center gap-2">
						<MapPinIcon class="size-4 shrink-0" />
						{event.location}
					</span>
				{/snippet}
				{#snippet actions()}
					{#if canManage}
						<Button
							href={resolve(`/events/${event.id}/admin`)}
							variant="outline"
							size="sm"
							data-testid="manage-event-link"
						>
							<PencilIcon />
							Manage event
						</Button>
					{/if}
				{/snippet}
			</PageHeader>

			<div class="mb-6">
				<!-- RSVP + attendee peek -->
				<div class="flex flex-col items-start gap-2">
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
								<!-- Attending is the settled state, so it steps back to outline and
								     lets the filled heart carry the signal; Attend stays the CTA. -->
								<Button
									type="submit"
									variant={attending ? 'outline' : 'default'}
									data-testid="rsvp-button"
									class={attending ? 'text-primary' : ''}
									onclick={() => {
										attending = !attending;
										optimisticCount += attending ? 1 : -1;
									}}
								>
									<HeartIcon class={attending ? 'fill-primary' : ''} />
									{#if attending}
										Attending · {optimisticCount}
									{:else}
										Attend · {optimisticCount}
									{/if}
								</Button>
							</form>
						{:else}
							<Button href={resolve('/sign-in')} data-testid="rsvp-sign-in-link">
								<HeartIcon />
								Attend · {optimisticCount}
							</Button>
						{/if}
					{/if}
					{#if attendeePeekLabel}
						<Button
							variant="link"
							size="sm"
							class="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
							onclick={() => (showAttendeesModal = true)}
						>
							{attendeePeekLabel}
							<ChevronRightIcon class="size-3 shrink-0" />
						</Button>
					{/if}
				</div>
			</div>

			<Dialog.Root bind:open={showAttendeesModal}>
				<Dialog.Content class="max-w-sm">
					<Dialog.Header>
						<Dialog.Title>{isPast ? 'Who attended' : 'Attendees'}</Dialog.Title>
					</Dialog.Header>
					<ul class="flex max-h-96 flex-col gap-3 overflow-y-auto py-2">
						{#each allAttendees as attendee, i (i)}
							<li class="flex items-center gap-3">
								{#if attendee.image}
									<img
										src={attendee.image}
										alt={attendee.name}
										class="size-8 shrink-0 rounded-full object-cover"
									/>
								{:else}
									<div class="shrink-0 rounded-full bg-primary/10 p-1.5">
										<UserIcon class="size-4 text-primary" />
									</div>
								{/if}
								<span class="text-sm">{attendee.name}</span>
							</li>
						{/each}
						{#if hiddenAttendeeCount > 0}
							<li class="flex items-center gap-3" data-testid="hidden-attendee-count">
								<div class="shrink-0 rounded-full bg-muted p-1.5">
									<UserIcon class="size-4 text-muted-foreground" />
								</div>
								<span class="text-sm text-muted-foreground">
									and {hiddenAttendeeCount}
									{hiddenAttendeeCount === 1 ? 'other' : 'others'}
								</span>
							</li>
						{/if}
					</ul>
				</Dialog.Content>
			</Dialog.Root>

			<!-- Tabs (only if schedules exist) -->
			<div class="border-t pt-6">
				{#if schedules.length > 0}
					<Tabs.Root value="description">
						<Tabs.List class="mb-4">
							<Tabs.Trigger value="description">Description</Tabs.Trigger>
							<Tabs.Trigger value="schedule">Schedule</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="description">
							{@render description()}
						</Tabs.Content>
						<Tabs.Content value="schedule">
							<ScheduleList {schedules} />
						</Tabs.Content>
					</Tabs.Root>
				{:else}
					{@render description()}
				{/if}
			</div>
		</PageShell>
	{:else}
		<PageShell width="content">
			<EmptyState
				icon={CalendarIcon}
				title="Event not found"
				description="It may have been removed, or the link might be wrong."
			>
				{#snippet action()}
					<Button href={resolve('/events')} variant="outline">Back to events</Button>
				{/snippet}
			</EmptyState>
		</PageShell>
	{/if}
</svelte:boundary>

{#snippet description()}
	{#if event.description}
		<RichContent content={event.description} class="text-base text-foreground/90" />
	{:else}
		<p class="text-muted-foreground">No description provided.</p>
	{/if}
{/snippet}
