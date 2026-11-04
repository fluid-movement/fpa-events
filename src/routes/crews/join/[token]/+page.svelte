<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import ConfirmSubmit from '#lib/components/layout/ConfirmSubmit.svelte';
	import { LAST_CREW_ADMIN_MESSAGE } from '#lib/crew-membership-policy';
	import { acceptInvite } from './data.remote';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<PageShell width="form">
	{#if data.expired}
		<PageHeader title="Invite link expired" description="Ask a crew admin for a new invitation." />
	{:else}
		<PageHeader
			title="Crew invitation"
			description={`You've been invited to join ${data.crewName} as a member.`}
		/>
		{#if data.current?.crewId === data.crewId}
			<p>You already belong to this crew.</p>
			<Button href={resolve('/crews/[id]', { id: data.crewId })}>View crew</Button>
		{:else if data.current}
			<p>You are in {data.current.name}; switch to {data.crewName}?</p>
			{#if data.switchBlocked}
				<p data-testid="crew-admin-prompt">{LAST_CREW_ADMIN_MESSAGE}</p>
				<Button href={resolve('/crews/[id]/admin/members', { id: data.current.crewId })}
					>Manage current crew</Button
				>
			{:else}
				<ConfirmSubmit
					form={acceptInvite}
					fields={{ token: data.token, previousCrewId: data.current.crewId }}
					title={`Switch to ${data.crewName}?`}
					description={`This leaves ${data.current.name} and joins ${data.crewName} as a member.`}
					confirmLabel="Switch crew"
					testIds={{ confirm: 'confirm-switch-crew' }}
				>
					{#snippet trigger()}<Button data-testid="switch-crew">Switch crew</Button>{/snippet}
				</ConfirmSubmit>
			{/if}
		{:else}
			<form {...acceptInvite}>
				<input {...acceptInvite.fields.token.as('hidden', data.token)} />
				<input {...acceptInvite.fields.previousCrewId.as('hidden', '')} />
				<Button type="submit" data-testid="accept-crew-invite" disabled={acceptInvite.pending > 0}
					>{acceptInvite.pending > 0 ? 'Joining…' : 'Join crew'}</Button
				>
			</form>
		{/if}
	{/if}
</PageShell>
