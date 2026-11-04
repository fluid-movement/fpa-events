<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import Section from '#lib/components/layout/Section.svelte';
	import CopyField from '#lib/components/layout/CopyField.svelte';
	import ConfirmSubmit from '#lib/components/layout/ConfirmSubmit.svelte';
	import { hoursUntil } from '#lib/utils/dates';
	import { LAST_CREW_ADMIN_MESSAGE } from '#lib/crew-membership-policy';
	import { generateLink, revokeLink, changeRole, removeMember } from './data.remote';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const adminCount = $derived(data.members.filter((m) => m.role === 'admin').length);
</script>

<PageShell>
	<PageHeader title={`Members of ${data.crew.name}`} />
	<div class="flex flex-col gap-8">
		<Button variant="outline" href={resolve('/crews/[id]', { id: data.crew.id })}>View crew</Button>
		<Section title="Members">
			<p>{LAST_CREW_ADMIN_MESSAGE}</p>
			<ul class="flex flex-col gap-4">
				{#each data.members as member (member.userId)}
					{@const protectedAdmin = member.role === 'admin' && adminCount === 1}
					{@const roleForm = changeRole.for(member.userId)}
					{@const removeForm = removeMember.for(member.userId)}
					<li
						data-testid={`crew-member-${member.userId}`}
						class="flex flex-wrap items-center gap-3"
					>
						<span>{member.name} — {member.role}</span>
						{#if member.role === 'member'}
							<form {...roleForm}>
								<input {...roleForm.fields.crewId.as('hidden', data.crew.id)} />
								<input {...roleForm.fields.userId.as('hidden', member.userId)} />
								<input {...roleForm.fields.role.as('hidden', 'admin')} />
								<Button
									type="submit"
									data-testid={`promote-${member.userId}`}
									disabled={roleForm.pending > 0}
									>{roleForm.pending > 0 ? 'Promoting…' : 'Make admin'}</Button
								>
							</form>
						{:else if !protectedAdmin}
							<ConfirmSubmit
								form={roleForm}
								fields={{ crewId: data.crew.id, userId: member.userId, role: 'member' }}
								title={`Demote ${member.name}?`}
								description="They will lose access to crew management."
								confirmLabel="Demote"
								testIds={{ confirm: `confirm-demote-${member.userId}` }}
							>
								{#snippet trigger()}<Button
										variant="outline"
										data-testid={`demote-${member.userId}`}>Make member</Button
									>{/snippet}
							</ConfirmSubmit>
						{/if}
						{#if !protectedAdmin}
							<ConfirmSubmit
								form={removeForm}
								fields={{ crewId: data.crew.id, userId: member.userId }}
								title={`Remove ${member.name}?`}
								description="They will no longer belong to this crew."
								confirmLabel="Remove member"
								testIds={{ confirm: `confirm-remove-${member.userId}` }}
							>
								{#snippet trigger()}<Button
										variant="outline"
										data-testid={`remove-${member.userId}`}>Remove member</Button
									>{/snippet}
							</ConfirmSubmit>
						{/if}
					</li>
				{/each}
			</ul>
		</Section>
		<Section
			title="Invite members"
			description="Links expire after 48 hours. Anyone accepting joins as a member; promote admins separately."
		>
			<form {...generateLink}>
				<input {...generateLink.fields.crewId.as('hidden', data.crew.id)} />
				<Button type="submit" data-testid="generate-crew-link" disabled={generateLink.pending > 0}
					>{generateLink.pending > 0 ? 'Generating…' : 'Generate invite link'}</Button
				>
			</form>
			<ul class="flex flex-col gap-4">
				{#each data.links as link (link.id)}
					{@const revokeForm = revokeLink.for(link.id)}
					<li data-testid={`crew-link-${link.id}`}>
						<a
							href={resolve('/crews/join/[token]', { token: link.id })}
							data-testid="crew-invite-url">{link.url}</a
						>
						<CopyField value={link.url} />
						<p>
							{hoursUntil(link.expiresAt) <= 0
								? 'Expired or expires within the hour'
								: `Expires in ${hoursUntil(link.expiresAt)} hours`}
						</p>
						<ConfirmSubmit
							form={revokeForm}
							fields={{ crewId: data.crew.id, token: link.id }}
							title="Revoke invite link?"
							description="This link will stop accepting new members."
							confirmLabel="Revoke"
							testIds={{ confirm: `confirm-revoke-${link.id}` }}
						>
							{#snippet trigger()}<Button variant="outline" data-testid={`revoke-${link.id}`}
									>Revoke link</Button
								>{/snippet}
						</ConfirmSubmit>
					</li>
				{/each}
			</ul>
		</Section>
	</div>
</PageShell>
