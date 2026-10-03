<script lang="ts">
	import { tabsListVariants, tabsTriggerVariants } from '#lib/components/ui/tabs';
	import { tabIndicator } from '#lib/actions/tab-indicator';
	import { cn } from '#lib/utils';

	export type SegmentedTab = {
		label: string;
		href: string;
		/** Pathnames that count as this tab being active. Defaults to [href]. */
		match?: string[];
		/** Trailing count, shown quieter than the label. */
		count?: number | string;
		testid?: string;
	};

	let {
		tabs,
		/** Current pathname (or any value matched against href/match). */
		current,
		label,
		/** Stretch the tabs to fill the width — good for 2-3 tabs on a phone. */
		fill = false,
		class: className,
		'data-testid': testId
	}: {
		tabs: SegmentedTab[];
		current: string;
		label: string;
		fill?: boolean;
		class?: string;
		'data-testid'?: string;
	} = $props();

	const isActive = (tab: SegmentedTab) => (tab.match ?? [tab.href]).includes(current);

	// More than three labels won't fit a phone, so the bar scrolls and bleeds to
	// the screen edge instead of wrapping.
	const scrolls = $derived(tabs.length > 3);
</script>

<div class={cn(scrolls && '-mx-4 overflow-x-auto px-4 pt-1 pb-2 md:mx-0 md:px-0', className)}>
	<nav
		class={cn(tabsListVariants(), scrolls && 'w-max', fill && 'flex w-full')}
		data-orientation="horizontal"
		data-testid={testId}
		aria-label={label}
		use:tabIndicator
	>
		<span class="tab-indicator" data-tab-indicator aria-hidden="true"></span>
		{#each tabs as tab (tab.href)}
			{@const active = isActive(tab)}
			<a
				href={tab.href}
				aria-current={active ? 'page' : undefined}
				data-state={active ? 'active' : 'inactive'}
				data-testid={tab.testid}
				class={cn(tabsTriggerVariants(), !fill && !scrolls && 'flex-none')}
			>
				{tab.label}
				{#if tab.count !== undefined}
					<span class="text-xs tabular-nums opacity-70">{tab.count}</span>
				{/if}
			</a>
		{/each}
	</nav>
</div>
