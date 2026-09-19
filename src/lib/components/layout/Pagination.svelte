<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	let {
		page,
		pageCount,
		total,
		pageSize,
		/** Builds the href for a page number. */
		hrefFor,
		/** What is being counted, for the summary line. */
		noun = 'results',
		'data-testid': testId
	}: {
		page: number;
		pageCount: number;
		total: number;
		pageSize: number;
		hrefFor: (page: number) => string;
		noun?: string;
		'data-testid'?: string;
	} = $props();

	// Defaulted here rather than in the destructure: a default on a quoted,
	// renamed key reads as unused to svelte/no-unused-props. The other layout
	// components take their test id the same way.
	const id = $derived(testId ?? 'pagination');

	const first = $derived((page - 1) * pageSize + 1);
	const last = $derived(Math.min(page * pageSize, total));

	// An end of the range gets no href at all, so it renders as a real disabled
	// <button> rather than an anchor that merely looks inert.
	const prevHref = $derived(page > 1 ? hrefFor(page - 1) : undefined);
	const nextHref = $derived(page < pageCount ? hrefFor(page + 1) : undefined);
</script>

<!-- Links rather than buttons, so paging works before hydration, survives a
     reload and can be shared — the same reason SegmentedTabs carries tab state
     in the URL. -->
<nav class="mt-6 flex items-center justify-between gap-4" aria-label="Pagination" data-testid={id}>
	<p class="text-sm text-muted-foreground tabular-nums" data-testid="{id}-summary">
		{#if total === 0}
			No {noun}
		{:else}
			{first}–{last} of {total}
			{noun}
		{/if}
	</p>

	{#if pageCount > 1}
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				href={prevHref}
				disabled={!prevHref}
				data-testid="{id}-prev"
			>
				<ChevronLeftIcon />
				Previous
			</Button>

			<span class="text-sm text-muted-foreground tabular-nums">
				{page} / {pageCount}
			</span>

			<Button
				variant="outline"
				size="sm"
				href={nextHref}
				disabled={!nextHref}
				data-testid="{id}-next"
			>
				Next
				<ChevronRightIcon />
			</Button>
		</div>
	{/if}
</nav>
