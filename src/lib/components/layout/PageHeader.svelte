<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { cn } from '$lib/utils';

	let {
		title,
		description,
		eyebrow,
		back,
		class: className,
		badge,
		meta,
		actions
	}: {
		title: string;
		description?: string;
		/** Small uppercase label above the title — "Manage event", "Past events". */
		eyebrow?: string;
		/** Back affordance, shown above everything else. */
		back?: { href: string; label: string };
		class?: string;
		/** Status chip shown inline after the title. */
		badge?: Snippet;
		/** Date, location — the line under the title. */
		meta?: Snippet;
		/** Page-level actions. Stacked under the title on mobile, inline on desktop. */
		actions?: Snippet;
	} = $props();
</script>

<div class={cn('pb-5 md:pb-6', className)}>
	{#if back}
		<div class="mb-2 -ml-2 md:-ml-2.5">
			<Button href={back.href} variant="ghost" size="sm">
				<ArrowLeftIcon />
				{back.label}
			</Button>
		</div>
	{/if}

	<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
		<div class="min-w-0 space-y-1.5">
			{#if eyebrow}
				<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
					{eyebrow}
				</p>
			{/if}
			{#if badge}
				<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
					<h1 class="text-balance">{title}</h1>
					{@render badge()}
				</div>
			{:else}
				<h1 class="text-balance">{title}</h1>
			{/if}
			{#if description}
				<p class="text-muted-foreground">{description}</p>
			{/if}
			{#if meta}
				<div
					class="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-sm text-muted-foreground"
				>
					{@render meta()}
				</div>
			{/if}
		</div>

		{#if actions}
			<!-- Actions come after the title in the DOM so screen readers and keyboard
			     users meet the heading first, but they stay reachable by thumb. -->
			<div class="flex shrink-0 flex-wrap items-center gap-2">
				{@render actions()}
			</div>
		{/if}
	</div>
</div>
