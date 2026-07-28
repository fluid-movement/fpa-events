<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import EmptyState from '$lib/components/layout/EmptyState.svelte';
	import CloudOffIcon from '@lucide/svelte/icons/cloud-off';
	import { dev } from '$app/environment';

	interface Props {
		/** Diagnostic detail. Shown only in dev — it names internal hosts. */
		message?: string;
	}

	let { message }: Props = $props();
</script>

<div class="rounded-xl border border-dashed" data-testid="rankings-unavailable">
	<EmptyState
		icon={CloudOffIcon}
		title="Rankings are temporarily unavailable"
		description="The rankings service could not be reached. This is usually brief — the data comes from a separate system that refreshes on a schedule."
	>
		{#snippet action()}
			<Button variant="outline" data-testid="rankings-retry" onclick={() => location.reload()}>
				Try again
			</Button>
		{/snippet}
	</EmptyState>
	{#if dev && message}
		<pre
			class="mx-4 mb-4 overflow-x-auto rounded-md bg-muted/50 p-3 text-left text-xs text-muted-foreground">{message}</pre>
	{/if}
</div>
