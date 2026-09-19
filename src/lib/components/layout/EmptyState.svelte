<script lang="ts">
	import type { Component } from 'svelte';
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils';

	let {
		title,
		description,
		icon: Icon,
		/** Compact sits inside a panel or card; page fills an empty route. */
		size = 'page',
		class: className,
		action
	}: {
		title: string;
		description?: string;
		icon?: Component<{ class?: string }>;
		size?: 'page' | 'compact';
		class?: string;
		action?: Snippet;
	} = $props();
</script>

<div
	class={cn(
		'flex flex-col items-center text-center',
		size === 'page' ? 'gap-3 py-12 md:py-16' : 'gap-2 py-8',
		className
	)}
>
	{#if Icon}
		<div class="surface-sunken mb-1 flex size-11 items-center justify-center rounded-xl">
			<Icon class="size-5 text-muted-foreground" />
		</div>
	{/if}
	<p class={cn('font-semibold text-foreground', size === 'page' && 'text-lg')}>{title}</p>
	{#if description}
		<p class="max-w-sm text-sm text-balance text-muted-foreground">{description}</p>
	{/if}
	{#if action}
		<div class="mt-1">{@render action()}</div>
	{/if}
</div>
