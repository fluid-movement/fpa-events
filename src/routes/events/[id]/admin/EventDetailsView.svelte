<script lang="ts">
	import type { Snippet } from 'svelte';
	import RichContent from '$lib/components/RichContent.svelte';
	import { formatDateRange } from '$lib/utils/dates';

	interface Props {
		event: {
			name: string;
			description: string;
			startDate: string;
			endDate: string;
			location: string;
			picture: string | null;
			pictureWidth: number | null;
			pictureHeight: number | null;
		};
	}

	let { event }: Props = $props();

	const dateRange = $derived(formatDateRange(new Date(event.startDate), new Date(event.endDate)));
</script>

<!-- Dense two-column rows on desktop; on mobile the label sits directly above its
     value with tight spacing, so the whole record stays scannable on one screen. -->
{#snippet row(label: string, value: Snippet)}
	<div class="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-4">
		<dt class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{label}</dt>
		<dd class="min-w-0 text-sm font-medium">{@render value()}</dd>
	</div>
{/snippet}

{#snippet notSet()}
	<span class="font-normal text-muted-foreground">Not set</span>
{/snippet}

<dl class="surface divide-y divide-border rounded-xl" data-testid="event-details-view">
	{@render row('Name', name)}
	{@render row('Location', location)}
	{@render row('Dates', dates)}
	{@render row('Description', description)}
	{@render row('Cover image', cover)}
</dl>

{#snippet name()}{event.name}{/snippet}

{#snippet location()}
	{#if event.location}{event.location}{:else}{@render notSet()}{/if}
{/snippet}

{#snippet dates()}{dateRange}{/snippet}

{#snippet description()}
	{#if event.description}
		<!-- Descriptions run long. Show the opening lines only; the full text is in
		     the edit form and on the public page. -->
		<RichContent
			content={event.description}
			class="line-clamp-3 font-normal text-foreground/90 [&_*]:my-0 [&_*]:inline"
		/>
	{:else}
		{@render notSet()}
	{/if}
{/snippet}

{#snippet cover()}
	{#if event.picture}
		<img
			src={event.picture}
			alt="{event.name} cover"
			width={event.pictureWidth ?? undefined}
			height={event.pictureHeight ?? undefined}
			class="max-h-28 w-auto rounded-md border object-cover"
		/>
	{:else}
		{@render notSet()}
	{/if}
{/snippet}
