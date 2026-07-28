<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		title,
		description,
		/** Renders the title as a small uppercase overline instead of a heading. */
		overline = false,
		class: className,
		action,
		children
	}: {
		title?: string;
		description?: string;
		overline?: boolean;
		class?: string;
		/** Right-hand control on the title row — "Add location", "View all". */
		action?: Snippet;
		children: Snippet;
	} = $props();
</script>

<section class={cn('space-y-3 md:space-y-4', className)}>
	{#if title || action}
		<div class="flex items-center justify-between gap-3">
			<div class="min-w-0 space-y-1">
				{#if title}
					{#if overline}
						<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
							{title}
						</h2>
					{:else}
						<h2>{title}</h2>
					{/if}
				{/if}
				{#if description}
					<p class="text-sm text-muted-foreground">{description}</p>
				{/if}
			</div>
			{#if action}
				<div class="shrink-0">{@render action()}</div>
			{/if}
		</div>
	{/if}
	{@render children()}
</section>
