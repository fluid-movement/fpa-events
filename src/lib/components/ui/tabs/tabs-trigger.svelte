<script lang="ts" module>
	import { tv } from 'tailwind-variants';

	export const tabsTriggerVariants = tv({
		base: [
			"tab-trigger text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=inactive]:hover:bg-foreground/5 focus-visible:border-ring focus-visible:ring-ring/50 relative inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3.5 text-sm font-semibold whitespace-nowrap transition-[color,background-color] duration-200 outline-none select-none active:translate-y-px focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
			// The line list slides an underline instead of a pill, so its triggers
			// stay flush and unfilled.
			'group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:px-2.5 group-data-[variant=line]/tabs-list:data-[state=inactive]:hover:bg-transparent'
		]
	});
</script>

<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: TabsPrimitive.TriggerProps = $props();
</script>

<TabsPrimitive.Trigger
	bind:ref
	data-slot="tabs-trigger"
	class={cn(tabsTriggerVariants(), className)}
	{...restProps}
/>
