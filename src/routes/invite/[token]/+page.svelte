<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

{#if data.expired}
	<div class="max-w-md mx-auto text-center py-20">
		<h1 class="text-2xl font-bold mb-3">Invite Link Expired</h1>
		<p class="text-muted-foreground mb-6">
			This invite link has expired. Ask the event organizer for a new one.
		</p>
		<Button href={resolve('/events')}>Back to Events</Button>
	</div>
{/if}
