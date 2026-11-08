<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '#lib/components/ui/badge';
	import EmptyState from '#lib/components/layout/EmptyState.svelte';
	import SearchXIcon from '@lucide/svelte/icons/search-x';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { formatApiDateRange } from '#lib/utils/dates';
	import type { ResultEventRow } from '#lib/results/types';

	let { rows }: { rows: ResultEventRow[] } = $props();
</script>

<!-- Linked rows rather than a DataList: every row's job is to navigate, and a
     table cell cannot be an anchor without losing its row semantics. -->
{#if rows.length === 0}
	<div data-testid="results-no-matches">
		<EmptyState
			icon={SearchXIcon}
			title="No events match these filters"
			description="Try a shorter search, or widen the division and year."
			size="compact"
		/>
	</div>
{:else}
	<ul class="space-y-2" data-testid="results-list">
		{#each rows as row (row.id)}
			<li>
				<a
					href={resolve('/results/[eventId]', { eventId: row.id })}
					class="surface-row block rounded-xl px-4 py-3"
					data-testid="results-row-{row.id}"
				>
					<p class="mb-4 truncate font-semibold">{row.name}</p>
					<!-- Divisions and date share the line half and half; the date sits on the
					     last badge row, not centred against a wrapped set of them. -->
					<div class="mt-1 grid grid-cols-2 items-end gap-3">
						<div class="flex flex-wrap items-center gap-1.5">
							{#each row.divisions as division (division)}
								<Badge variant="outline" class="text-xs font-normal">{division}</Badge>
							{/each}
						</div>
						<div class="flex items-center justify-end gap-2 text-sm text-muted-foreground">
							<span class="text-right">
								{formatApiDateRange(row.startDate, row.endDate, 'short')}
							</span>
							<ChevronRightIcon class="size-4 shrink-0" />
						</div>
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}
