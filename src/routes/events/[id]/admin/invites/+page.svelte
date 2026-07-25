<script lang="ts">
	import { page } from '$app/state';
	import InviteSection from '$lib/components/event-admin/InviteSection.svelte';
	import { generateLink, regenerateLink } from './magic-links.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const event = $derived(data.event);
	const magicLink = $derived(data.magicLink);
	const magicLinkUrl = $derived(magicLink ? `${page.url.origin}/invite/${magicLink.id}` : null);
	const organizers = $derived(
		data.attendees.filter((a) => a.status === 'organizing' && a.userId !== event.userId)
	);
</script>

<InviteSection
	eventId={event.id}
	{magicLink}
	{magicLinkUrl}
	{organizers}
	generateLinkForm={generateLink}
	regenerateLinkForm={regenerateLink}
/>
