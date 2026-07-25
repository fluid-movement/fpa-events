<script lang="ts">
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
<dl class="divide-y divide-border rounded-lg border" data-testid="event-details-view">
	<div class="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-4">
		<dt class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Name</dt>
		<dd class="text-sm font-medium">{event.name}</dd>
	</div>

	<div class="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-4">
		<dt class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Location</dt>
		<dd class="text-sm font-medium">
			{#if event.location}
				{event.location}
			{:else}
				<span class="font-normal text-muted-foreground">Not set</span>
			{/if}
		</dd>
	</div>

	<div class="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-4">
		<dt class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Dates</dt>
		<dd class="text-sm font-medium">{dateRange}</dd>
	</div>

	<div class="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
		<dt class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Description</dt>
		<dd class="min-w-0 text-sm">
			{#if event.description}
				<!-- Descriptions run long. Show the opening lines only; the full text is
				     in the edit form and on the public page. -->
				<RichContent
					content={event.description}
					class="line-clamp-3 text-foreground/90 [&_*]:my-0 [&_*]:inline"
				/>
			{:else}
				<span class="text-muted-foreground">Not set</span>
			{/if}
		</dd>
	</div>

	<div class="grid gap-1 px-4 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
		<dt class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Cover image</dt>
		<dd class="text-sm">
			{#if event.picture}
				<img
					src={event.picture}
					alt="{event.name} cover"
					width={event.pictureWidth ?? undefined}
					height={event.pictureHeight ?? undefined}
					class="max-h-28 w-auto rounded-md border object-cover"
				/>
			{:else}
				<span class="text-muted-foreground">Not set</span>
			{/if}
		</dd>
	</div>
</dl>
