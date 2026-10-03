<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '#lib/components/ui/button';
	import { Badge } from '#lib/components/ui/badge';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import SegmentedTabs from '#lib/components/layout/SegmentedTabs.svelte';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import SetupChecklist from './SetupChecklist.svelte';
	import type { ChecklistItem } from './SetupChecklist.svelte';
	import { Skeleton } from '#lib/components/ui/skeleton';
	import { getEvent } from './event-details.remote';
	import { listEventLocations } from './schedule/locations.remote';
	import { formatDateRange } from '#lib/utils/dates';
	import { coOrganizers } from '#lib/utils/attendees';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const event = $derived(data.event);
	const attendees = $derived(data.attendees);
	const magicLink = $derived(data.magicLink);
	const scheduleCount = $derived(data.scheduleCount);

	// Keyed remote queries: calling them here as well as in a child route dedupes
	// rather than double-fetching.
	const details = $derived(await getEvent(event.id));
	const locations = $derived(await listEventLocations(event.id));

	const base = $derived(resolve('/events/[id]/admin', { id: event.id }));

	// Sourced from `getEvent` rather than the layout load so that saving on the
	// edit form updates the header immediately.
	const dateRange = $derived(formatDateRange(details.startDate, details.endDate));
	const eventStatus = $derived.by(() => {
		const now = Date.now();
		const start = new Date(details.startDate).getTime();
		const end = new Date(details.endDate).getTime();
		if (now < start) return 'Upcoming';
		if (now > end) return 'Past';
		return 'Happening now';
	});

	const organizers = $derived(coOrganizers(attendees, event.userId));

	// Exact matching, not `startsWith` — /admin is a prefix of every child route,
	// so a prefix test would light up Details on every tab.
	const tabs = $derived([
		// Details owns the bare /admin URL, so it also covers the edit form.
		{ label: 'Details', href: base, match: [base, `${base}/edit`], testid: 'manage-tab-details' },
		{
			label: 'Attendees',
			count: attendees.length,
			href: `${base}/attendees`,
			match: [`${base}/attendees`],
			testid: 'manage-tab-attendees'
		},
		{
			label: 'Schedule',
			count: scheduleCount,
			href: `${base}/schedule`,
			match: [`${base}/schedule`],
			testid: 'manage-tab-schedule'
		},
		{
			label: 'Invites',
			href: `${base}/invites`,
			match: [`${base}/invites`],
			testid: 'manage-tab-invites'
		}
	]);

	const checklistItems = $derived<ChecklistItem[]>([
		{ label: 'Event details', done: true },
		{ label: 'Add a cover image', done: !!details.picture, href: `${base}/edit` },
		{ label: 'Add a schedule', done: scheduleCount > 0, href: `${base}/schedule` },
		{
			label: 'Add venue locations',
			done: (locations ?? []).length > 0,
			href: `${base}/schedule`
		},
		{
			label: 'Invite co-organizers',
			done: !!magicLink || organizers.length > 0,
			href: `${base}/invites`
		}
	]);
</script>

<PageShell width="content">
	<svelte:boundary>
		{#snippet pending()}
			<div class="pb-5 md:pb-6" aria-hidden="true">
				<Skeleton class="mb-2 h-3.5 w-28" />
				<div class="flex flex-wrap items-center gap-3">
					<Skeleton class="h-7 w-56" />
					<Skeleton class="h-5 w-24 rounded-full" />
				</div>
				<div class="mt-2.5 flex flex-wrap gap-4">
					<Skeleton class="h-4 w-32" />
					<Skeleton class="h-4 w-28" />
				</div>
			</div>
			<!-- Mirrors SetupChecklist's panel — keep the surface and padding in sync. -->
			<div class="surface mb-6 rounded-xl p-5" aria-hidden="true">
				<div class="mb-4 flex items-start justify-between gap-4">
					<Skeleton class="h-5 w-48" />
					<Skeleton class="size-7 rounded-md" />
				</div>
				<div class="space-y-1">
					<Skeleton class="h-8 w-full" />
					<Skeleton class="h-8 w-full" />
					<Skeleton class="h-8 w-3/4" />
				</div>
			</div>
		{/snippet}

		<PageHeader
			title={details.name}
			eyebrow="Manage event"
			back={{ href: resolve('/organizing'), label: 'Organizing' }}
			class="pb-4"
		>
			{#snippet badge()}
				<Badge variant="secondary" data-testid="event-status">{eventStatus}</Badge>
			{/snippet}
			<!-- Attendee and schedule counts live in the tab labels; repeating them
			     here was just noise. -->
			{#snippet meta()}
				<span class="flex items-center gap-1.5">
					<CalendarIcon class="size-3.5 shrink-0" />
					{dateRange}
				</span>
				{#if details.location}
					<span class="flex items-center gap-1.5">
						<MapPinIcon class="size-3.5 shrink-0" />
						{details.location}
					</span>
				{/if}
			{/snippet}
			{#snippet actions()}
				<Button href={resolve('/events/[id]', { id: event.id })} variant="outline" size="sm">
					View public page
				</Button>
			{/snippet}
		</PageHeader>

		<SetupChecklist
			eventId={event.id}
			eventName={details.name}
			items={checklistItems}
			publicUrl={`${page.url.origin}/events/${event.id}`}
			isPast={eventStatus === 'Past'}
		/>
	</svelte:boundary>

	<SegmentedTabs {tabs} current={page.url.pathname} label="Manage event" class="mb-6" />

	{@render children()}
</PageShell>
