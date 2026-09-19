<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(
		'surface flex flex-col gap-5 rounded-xl py-5 text-card-foreground md:gap-6 md:py-6',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
