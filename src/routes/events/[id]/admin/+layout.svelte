<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import SetupChecklist from '$lib/components/event-admin/SetupChecklist.svelte';
	import type { ChecklistItem } from '$lib/components/event-admin/SetupChecklist.svelte';
	import { getEvent } from './event-details.remote';
	import { listEventLocations } from './schedule/locations.remote';
	import { formatDateRange } from '$lib/utils/dates';
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

	const base = $derived(resolve(`/events/${event.id}/admin`));

	// Sourced from `getEvent` rather than the layout load so that saving on the
	// edit form updates the header immediately.
	const dateRange = $derived(
		formatDateRange(new Date(details.startDate), new Date(details.endDate))
	);
	const eventStatus = $derived.by(() => {
		const now = Date.now();
		const start = new Date(details.startDate).getTime();
		const end = new Date(details.endDate).getTime();
		if (now < start) return 'Upcoming';
		if (now > end) return 'Past';
		return 'Happening now';
	});

	const organizers = $derived(
		attendees.filter((a) => a.status === 'organizing' && a.userId !== event.userId)
	);

	const tabs = $derived([
		// Details owns the bare /admin URL, so it also covers the edit form.
		{ label: 'Details', href: base, match: [base, `${base}/edit`], testid: 'details' },
		{
			label: `Attendees (${attendees.length})`,
			href: `${base}/attendees`,
			match: [`${base}/attendees`],
			testid: 'attendees'
		},
		{
			label: `Schedule (${scheduleCount})`,
			href: `${base}/schedule`,
			match: [`${base}/schedule`],
			testid: 'schedule'
		},
		{ label: 'Invites', href: `${base}/invites`, match: [`${base}/invites`], testid: 'invites' }
	]);

	// Exact matching, not `startsWith` — /admin is a prefix of every child route,
	// so a prefix test would light up Details on every tab.
	const isActive = (match: string[]) => match.includes(page.url.pathname);

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

<div class="mx-auto max-w-4xl">
	<div class="mb-4 flex items-center justify-between">
		<Button href={resolve('/organizing')} variant="ghost" size="sm">
			<ArrowLeftIcon class="size-4" />
			Organizing
		</Button>
		<Button href={resolve(`/events/${event.id}`)} variant="outline" size="sm">
			View public page
		</Button>
	</div>

	<div class="space-y-2 pb-5">
		<p class="text-xs font-medium tracking-widest text-muted-foreground uppercase">Manage event</p>
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
			<h1 class="text-2xl leading-tight font-bold">{details.name}</h1>
			<Badge variant="secondary" data-testid="event-status">{eventStatus}</Badge>
		</div>
		<!-- Attendee and schedule counts live in the tab labels; repeating them here
		     was just noise. -->
		<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
		</div>
	</div>

	<SetupChecklist
		eventId={event.id}
		eventName={details.name}
		items={checklistItems}
		publicUrl={`${page.url.origin}/events/${event.id}`}
		isPast={eventStatus === 'Past'}
	/>

	<!-- Four labels with counts overflow a phone, so the bar scrolls and bleeds to
	     the screen edge on mobile. -->
	<div class="-mx-4 mb-6 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
		<nav class="flex w-max gap-1 rounded-lg border bg-muted/40 p-1" aria-label="Manage event">
			{#each tabs as tab (tab.href)}
				{@const active = isActive(tab.match)}
				<a
					href={tab.href}
					aria-current={active ? 'page' : undefined}
					data-testid="manage-tab-{tab.testid}"
					class="rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors {active
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					{tab.label}
				</a>
			{/each}
		</nav>
	</div>

	{@render children()}
</div>
