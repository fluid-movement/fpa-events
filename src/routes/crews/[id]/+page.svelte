<script lang="ts">
	import CrewStats from '#lib/components/CrewStats.svelte';
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button';
	import ConfirmSubmit from '#lib/components/layout/ConfirmSubmit.svelte';
	import { LAST_CREW_ADMIN_MESSAGE } from '#lib/crew-membership-policy';
	import { leaveCrew } from './data.remote';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import EventCalendarCard from '#lib/components/EventCalendarCard.svelte';
	import EmptyState from '#lib/components/layout/EmptyState.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<PageShell class="flex flex-col gap-8">
	<!-- Crew banner / picture: reserved for the crew content issue. -->
	<header class="surface rounded-2xl border-l-4 border-primary p-6 md:p-10">
		<PageHeader
			title={data.crew.name}
			eyebrow="Local freestyle crew"
			description={`${data.crew.city}, ${data.crew.country}`}
			back={{ href: resolve('/crews'), label: 'All crews' }}
		/>
	</header>
	<!-- Crew body text: reserved for the crew content issue. -->
	<!-- Contact links: reserved for the crew contact issue. -->
	<!-- Regular jams: reserved for the crew jams issue. -->
	<CrewStats stats={data.stats} />
	<section class="flex flex-col gap-4" aria-label="Crew members">
		<h2>Members</h2>
		<ul data-testid="crew-members">
			{#each data.namedMembers as member (member.id)}<li>{member.name}</li>{/each}
		</ul>
		{#if data.hiddenCount > 0}<p data-testid="crew-hidden-count">
				+ {data.hiddenCount} others
			</p>{/if}
		{#if data.canManage}<Button href={resolve('/crews/[id]/admin', { id: data.crew.id })}
				>Manage crew</Button
			>{/if}
		{#if data.isMember}
			{#if data.leaveBlocked}<p data-testid="crew-admin-prompt">{LAST_CREW_ADMIN_MESSAGE}</p>
			{:else}
				<ConfirmSubmit
					form={leaveCrew}
					fields={{ crewId: data.crew.id }}
					title={data.soleMember ? 'Leave and delete crew?' : 'Leave crew?'}
					description={data.soleMember
						? 'You are the only member. Leaving permanently deletes this crew and its invite links.'
						: 'You will no longer belong to this crew.'}
					confirmLabel="Leave crew"
					testIds={{ confirm: 'confirm-leave-crew' }}
				>
					{#snippet trigger()}<Button variant="outline" data-testid="leave-crew">Leave crew</Button
						>{/snippet}
				</ConfirmSubmit>
			{/if}
		{/if}
	</section>
	<section class="flex flex-col gap-4" aria-label="City events">
		<h2>Events in {data.crew.city}</h2>
		<p class="text-muted-foreground">All events in the city, hosted by the whole community.</p>
		<section
			class="flex flex-col gap-4"
			aria-label="Upcoming events"
			data-testid="crew-upcoming-events"
		>
			<h3>Upcoming events</h3>
			{#each data.upcoming as event (event.id)}
				<EventCalendarCard {event} attendeeCount={event.attendeeCount} />
			{:else}
				<EmptyState size="compact" title="No upcoming events in this city" />
			{/each}
		</section>
		<section
			id="past-events"
			class="flex flex-col gap-4"
			aria-label="Past events"
			data-testid="crew-past-events"
		>
			<h3>Past events</h3>
			{#each data.past as event (event.id)}
				<EventCalendarCard {event} attendeeCount={event.attendeeCount} />
			{:else}
				<EmptyState size="compact" title="No past events in this city" />
			{/each}
			{#if data.pastPages > 1}
				<nav aria-label="Past events pages" class="flex flex-wrap items-center gap-3">
					{#if data.pastPage > 1}
						<Button
							variant="outline"
							href={`${resolve('/crews/[id]', { id: data.crew.id })}?pastPage=${data.pastPage - 1}#past-events`}
							>Newer events</Button
						>
					{/if}
					<span class="text-sm text-muted-foreground">Page {data.pastPage} of {data.pastPages}</span
					>
					{#if data.pastPage < data.pastPages}
						<Button
							variant="outline"
							href={`${resolve('/crews/[id]', { id: data.crew.id })}?pastPage=${data.pastPage + 1}#past-events`}
							data-testid="crew-older-events">Older events</Button
						>
					{/if}
				</nav>
			{/if}
		</section>
	</section>
</PageShell>
