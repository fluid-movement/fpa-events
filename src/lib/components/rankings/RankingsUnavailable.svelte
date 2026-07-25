<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { dev } from '$app/environment';

	interface Props {
		/** Diagnostic detail. Shown only in dev — it names internal hosts. */
		message?: string;
	}

	let { message }: Props = $props();
</script>

<div class="rounded-lg border border-dashed p-8 text-center" data-testid="rankings-unavailable">
	<p class="font-medium">Rankings are temporarily unavailable</p>
	<p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
		The rankings service could not be reached. This is usually brief — the data comes from a
		separate system that refreshes on a schedule.
	</p>
	<Button
		class="mt-4"
		variant="outline"
		data-testid="rankings-retry"
		onclick={() => location.reload()}
	>
		Try again
	</Button>
	{#if dev && message}
		<pre class="mt-4 overflow-x-auto text-left text-xs text-muted-foreground">{message}</pre>
	{/if}
</div>
