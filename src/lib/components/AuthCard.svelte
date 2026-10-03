<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Card from '#lib/components/ui/card';

	let {
		title,
		description,
		children,
		footer
	}: {
		title: string;
		description: string;
		children: Snippet;
		/** The "already have an account?" line under the card body. */
		footer?: Snippet;
	} = $props();
</script>

<!-- The frame every signed-out page sits in: sign in, sign up, and the two
     password flows. They differ only in their fields. -->
<div class="flex min-h-[60vh] items-center justify-center">
	<Card.Root class="surface-glass w-full max-w-sm">
		<Card.Header>
			<Card.Title class="text-xl md:text-2xl">{title}</Card.Title>
			<Card.Description>{description}</Card.Description>
		</Card.Header>
		<Card.Content>
			{@render children()}
			{#if footer}
				<p class="mt-4 text-center text-sm text-muted-foreground">{@render footer()}</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
