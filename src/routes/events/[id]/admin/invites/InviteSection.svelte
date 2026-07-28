<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Section from '$lib/components/layout/Section.svelte';
	import CopyField from '$lib/components/layout/CopyField.svelte';
	import DataList, { type DataColumn } from '$lib/components/layout/DataList.svelte';
	import LinkIcon from '@lucide/svelte/icons/link';
	import type { Attendee } from '$lib/types/event';
	import { hoursUntil } from '$lib/utils/dates';
	import { generateLink, regenerateLink } from './magic-links.remote';

	interface MagicLink {
		id: string;
		expiresAt: Date;
	}

	interface Props {
		eventId: string;
		magicLink: MagicLink | null;
		magicLinkUrl: string | null;
		organizers: Attendee[];
	}

	let { eventId, magicLink, magicLinkUrl, organizers }: Props = $props();

	const magicLinkExpired = $derived(
		magicLink ? new Date(magicLink.expiresAt).getTime() < Date.now() : false
	);

	const columns: DataColumn<Attendee>[] = [
		{ header: 'Name', value: (o) => o.name, slot: 'primary' },
		{ header: 'Email', value: (o) => o.email, slot: 'subtitle', muted: true }
	];
</script>

<div class="max-w-lg space-y-8">
	<Section
		title="Invite organizers"
		description="Share a magic link to invite co-organizers. Anyone with the link can join as an organizer."
	>
		{#if !magicLink}
			<form {...generateLink}>
				<input type="hidden" name="eventId" value={eventId} />
				<Button type="submit" disabled={generateLink.pending > 0}>
					<LinkIcon />
					{generateLink.pending > 0 ? 'Generating…' : 'Generate invite link'}
				</Button>
			</form>
		{:else}
			<div class="space-y-3">
				<CopyField value={magicLinkUrl ?? ''} copyTestId="copy-invite-link" />
				<div class="flex items-center justify-between gap-3">
					{#if magicLinkExpired}
						<p class="text-sm text-destructive">Link expired</p>
					{:else}
						<p class="text-sm text-muted-foreground">
							Expires in {hoursUntil(magicLink.expiresAt)} hours
						</p>
					{/if}
					<form {...regenerateLink}>
						<input type="hidden" name="eventId" value={eventId} />
						<Button type="submit" variant="outline" size="sm" disabled={regenerateLink.pending > 0}>
							{regenerateLink.pending > 0 ? 'Regenerating…' : 'Regenerate'}
						</Button>
					</form>
				</div>
			</div>
		{/if}
	</Section>

	{#if organizers.length > 0}
		<Section title="Co-organizers">
			<DataList rows={organizers} {columns} getKey={(o) => o.id} />
		</Section>
	{/if}
</div>
