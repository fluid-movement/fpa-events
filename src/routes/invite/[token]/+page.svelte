<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import PageShell from '$lib/components/layout/PageShell.svelte';
	import EmptyState from '$lib/components/layout/EmptyState.svelte';
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
{/if}
