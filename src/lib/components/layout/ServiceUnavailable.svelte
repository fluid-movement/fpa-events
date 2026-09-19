<script lang="ts">
	import { Button } from '#lib/components/ui/button';
	import EmptyState from '#lib/components/layout/EmptyState.svelte';
	import CloudOffIcon from '@lucide/svelte/icons/cloud-off';
	import { dev } from '$app/env';

	interface Props {
		/** What was unavailable, e.g. "Results are temporarily unavailable". */
		title: string;
		description?: string;
		/** Diagnostic detail. Shown only in dev — it names internal hosts. */
		message?: string;
		testId?: string;
	}

	let {
		title,
		description = 'The data comes from a separate system that refreshes on a schedule, and it could not be reached. This is usually brief.',
		message,
		testId = 'service-unavailable'
	}: Props = $props();
</script>

<div class="rounded-xl border border-dashed" data-testid={testId}>
	<EmptyState icon={CloudOffIcon} {title} {description}>
		{#snippet action()}
			<Button variant="outline" data-testid="{testId}-retry" onclick={() => location.reload()}>
				Try again
			</Button>
		{/snippet}
	</EmptyState>
	{#if dev && message}
		<pre
			class="mx-4 mb-4 overflow-x-auto rounded-md bg-muted/50 p-3 text-left text-xs text-muted-foreground">{message}</pre>
	{/if}
</div>
