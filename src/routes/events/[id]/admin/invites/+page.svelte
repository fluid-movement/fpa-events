<script lang="ts">
	import { page } from '$app/state';
	import { coOrganizers } from '$lib/utils/attendees';
	import InviteSection from './InviteSection.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const event = $derived(data.event);
	const magicLink = $derived(data.magicLink);
	const magicLinkUrl = $derived(magicLink ? `${page.url.origin}/invite/${magicLink.id}` : null);
	const organizers = $derived(coOrganizers(data.attendees, event.userId));
</script>

<InviteSection eventId={event.id} {magicLink} {magicLinkUrl} {organizers} />
