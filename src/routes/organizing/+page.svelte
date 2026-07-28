<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import PageShell from '$lib/components/layout/PageShell.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import EmptyState from '$lib/components/layout/EmptyState.svelte';
	import { formatDateRange } from '$lib/utils/dates';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import HeartIcon from '@lucide/svelte/icons/heart';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type OrganizedEvent = (typeof data.upcoming)[number];
</script>

{#snippet eventRow(event: OrganizedEvent)}
	<div
		class="surface-row flex flex-col gap-3 rounded-lg p-4 md:flex-row md:items-start md:justify-between md:gap-4 md:p-5"
	>
		<div class="min-w-0 space-y-2">
			<div class="flex flex-wrap items-center gap-2">
				<h2 class="leading-tight">{event.name}</h2>
				{#if !event.isOwner}
					<Badge variant="outline" data-testid="co-organizer-badge">Co-organizer</Badge>
				{/if}
			</div>
			<div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
				<span class="flex items-center gap-1.5">
					<CalendarIcon class="size-3.5 shrink-0" />
					{formatDateRange(event.startDate, event.endDate)}
				</span>
				<span class="flex items-center gap-1.5">
					<MapPinIcon class="size-3.5 shrink-0" />
					{event.location}
				</span>
				<span class="flex items-center gap-1.5">
					<HeartIcon class="size-3.5 shrink-0" />
					{event.attendeeCount} attending
				</span>
			</div>
		</div>
		<!-- Full width and side by side on a phone; compact and right-aligned once
		     there's room next to the details. -->
		<div class="flex shrink-0 gap-2 *:flex-1 md:*:flex-none">
			<Button href={resolve(`/events/${event.id}`)} variant="outline" size="sm">
				View public page
			</Button>
			<Button href={resolve(`/events/${event.id}/admin`)} size="sm">Manage event</Button>
		</div>
	</div>
{/snippet}

<PageShell>
	<PageHeader title="Organizing" description="Events you're organizing." />

	<Tabs.Root value="upcoming">
		<div class="mb-6 flex items-center justify-between gap-3">
			<Tabs.List>
				<Tabs.Trigger value="upcoming">Upcoming ({data.upcoming.length})</Tabs.Trigger>
				<Tabs.Trigger value="past">Past ({data.past.length})</Tabs.Trigger>
			</Tabs.List>
			<Button href={resolve('/events/create')} size="sm">Create event</Button>
		</div>

		<Tabs.Content value="upcoming">
			{#if data.upcoming.length === 0}
				<EmptyState
					icon={ClipboardListIcon}
					title="You're not organizing anything yet"
					description="Create an event and it'll show up here with its management tools."
				>
					{#snippet action()}
						<Button href={resolve('/events/create')}>Create event</Button>
					{/snippet}
				</EmptyState>
			{:else}
				<div class="space-y-2 md:space-y-3">
					{#each data.upcoming as event (event.id)}
						{@render eventRow(event)}
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="past">
			{#if data.past.length === 0}
				<EmptyState icon={ClipboardListIcon} title="No past events" size="compact" />
			{:else}
				<div class="space-y-2 md:space-y-3">
					{#each data.past as event (event.id)}
						{@render eventRow(event)}
					{/each}
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</PageShell>
