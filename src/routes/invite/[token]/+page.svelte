<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import EmptyState from '#lib/components/layout/EmptyState.svelte';
	import Section from '#lib/components/layout/Section.svelte';
	import { acceptInvite } from './data.remote';
	import LinkOffIcon from '@lucide/svelte/icons/link-2-off';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

{#if data.expired}
	<PageShell width="form">
		<EmptyState
			icon={LinkOffIcon}
			title="Invite link expired"
			description="This invite link has expired. Ask the event organizer for a new one."
		>
			{#snippet action()}
				<Button href={resolve('/events')}>Back to events</Button>
			{/snippet}
		</EmptyState>
	</PageShell>
{:else}
	<PageShell width="form">
		<Section
			title="Organizer invitation"
			description={`You've been invited to co-organize ${data.eventName}.`}
		>
			<p>
				Accepting gives you access to manage this event and changes any existing RSVP to an
				organizer seat.
			</p>
			<form {...acceptInvite}>
				<input {...acceptInvite.fields.token.as('hidden', data.token)} />
				<Button type="submit" data-testid="accept-invite" disabled={acceptInvite.pending > 0}>
					{acceptInvite.pending > 0 ? 'Accepting…' : 'Accept invitation'}
				</Button>
			</form>
		</Section>
	</PageShell>
{/if}
