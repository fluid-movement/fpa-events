<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: TabsPrimitive.ContentProps = $props();
</script>

<TabsPrimitive.Content
	bind:ref
	data-slot="tabs-content"
	class={cn(
		'flex-1 animate-in text-sm duration-200 fade-in-0 outline-none slide-in-from-bottom-1 motion-reduce:animate-none',
		className
	)}
	{...restProps}
/>
