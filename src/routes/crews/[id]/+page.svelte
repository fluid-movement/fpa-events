<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button';
	import ConfirmSubmit from '#lib/components/layout/ConfirmSubmit.svelte';
	import { LAST_CREW_ADMIN_MESSAGE } from '#lib/crew-membership-policy';
	import { leaveCrew } from './data.remote';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<PageShell>
	<PageHeader title={data.crew.name} description={`${data.crew.city}, ${data.crew.country}`} />
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
</PageShell>
