<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import LinkIcon from '@lucide/svelte/icons/link';
	import type { Attendee } from '$lib/types/event';
	import { hoursUntil } from '$lib/utils/dates';

	interface MagicLink {
		id: string;
		expiresAt: Date;
	}

	interface Props {
		magicLink: MagicLink | null;
		magicLinkUrl: string | null;
		organizers: Attendee[];
	}

	let { magicLink, magicLinkUrl, organizers }: Props = $props();

	const magicLinkExpired = $derived(
		magicLink ? new Date(magicLink.expiresAt).getTime() < Date.now() : false
	);

	async function copyLink() {
		if (magicLinkUrl) {
			await navigator.clipboard.writeText(magicLinkUrl);
		}
	}
</script>

<div class="max-w-lg space-y-6">
	<div>
		<h2 class="text-lg font-semibold">Invite Organizers</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Share a magic link to invite co-organizers. Anyone with the link can join as an organizer.
		</p>
	</div>

	{#if !magicLink}
		<form method="POST" action="?/generateLink">
			<Button type="submit">
				<LinkIcon class="size-4" />
				Generate Invite Link
			</Button>
		</form>
	{:else}
		<div class="space-y-3">
			<div class="flex gap-2">
				<Input value={magicLinkUrl ?? ''} readonly class="font-mono text-xs" />
				<Button variant="outline" size="icon" onclick={copyLink} title="Copy link">
					<CopyIcon class="size-4" />
				</Button>
			</div>
			<div class="flex items-center justify-between">
				{#if magicLinkExpired}
					<p class="text-sm text-destructive">Link expired</p>
				{:else}
					<p class="text-sm text-muted-foreground">
						Expires in {hoursUntil(magicLink.expiresAt)} hours
					</p>
				{/if}
				<form method="POST" action="?/regenerateLink">
					<Button type="submit" variant="outline" size="sm">Regenerate</Button>
				</form>
			</div>
		</div>
	{/if}

	{#if organizers.length > 0}
		<div>
			<h3 class="mb-3 text-sm font-semibold">Co-organizers</h3>
			<div class="overflow-hidden rounded-lg border">
				<table class="w-full text-sm">
					<thead class="bg-muted/50">
						<tr>
							<th class="px-4 py-2 text-left font-medium">Name</th>
							<th class="px-4 py-2 text-left font-medium">Email</th>
						</tr>
					</thead>
					<tbody>
						{#each organizers as org (org.id)}
							<tr class="border-t">
								<td class="px-4 py-2">{org.name}</td>
								<td class="px-4 py-2 text-muted-foreground">{org.email}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
