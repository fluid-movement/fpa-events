<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const tabsListVariants = tv({
		base: 'tabs-track group/tabs-list text-muted-foreground relative isolate inline-flex w-fit items-center justify-center rounded-xl p-1 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:items-stretch',
		variants: {
			variant: {
				default: '',
				line: 'gap-1 rounded-none p-0'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	});

	export type TabsListVariant = VariantProps<typeof tabsListVariants>['variant'];
</script>

<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';
	import { tabIndicator } from '#lib/actions/tab-indicator';

	let {
		ref = $bindable(null),
		variant = 'default',
		class: className,
		children,
		...restProps
	}: TabsPrimitive.ListProps & {
		variant?: TabsListVariant;
	} = $props();

	// The list renders through a component, so the action is wired up by hand.
	$effect(() => (ref ? tabIndicator(ref).destroy : undefined));
</script>

<TabsPrimitive.List
	bind:ref
	data-slot="tabs-list"
	data-variant={variant}
	class={cn(tabsListVariants({ variant }), className)}
	{...restProps}
>
	<span class="tab-indicator" data-tab-indicator aria-hidden="true"></span>
	{@render children?.()}
</TabsPrimitive.List>
