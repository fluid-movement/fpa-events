<script lang="ts" generics="Row extends { playerId: string; fullName: string }">
	import type { Snippet } from 'svelte';
	import { Button } from '#lib/components/ui/button';
	import DataList, { type DataColumn } from '#lib/components/layout/DataList.svelte';
	import EmptyState from '#lib/components/layout/EmptyState.svelte';
	import SearchXIcon from '@lucide/svelte/icons/search-x';
	import PlayerSearch from './PlayerSearch.svelte';
	import { PlayerList } from '#lib/rankings/playerList.svelte';

	let {
		rows,
		columns,
		/** Prefix for the `data-testid`s: `<prefix>-table`, `<prefix>-search`, … */
		testIdPrefix,
		emptyTitle,
		emptyDescription,
		trailing,
		expanded,
		isExpanded
	}: {
		rows: Row[];
		columns: DataColumn<Row>[];
		testIdPrefix: string;
		/** Shown when the series itself has no rows, as opposed to no matches. */
		emptyTitle: string;
		emptyDescription?: string;
		trailing?: Snippet<[Row]>;
		expanded?: Snippet<[Row]>;
		isExpanded?: (row: Row) => boolean;
	} = $props();

	const list = new PlayerList(() => rows);
</script>

<!-- Search, truncate-with-"show all", and the two empty states are identical for
     rankings and ratings; only the columns and the per-row extras differ. -->
{#if rows.length === 0}
	<EmptyState title={emptyTitle} description={emptyDescription} size="compact" />
{:else}
	<PlayerSearch
		bind:value={list.search}
		resultCount={list.filtered.length}
		testId="{testIdPrefix}-search"
	/>

	{#if list.filtered.length === 0}
		<div data-testid="{testIdPrefix}-no-matches">
			<EmptyState
				icon={SearchXIcon}
				title="No players match “{list.search}”"
				description="Try a shorter search, or check the spelling."
				size="compact"
			/>
		</div>
	{:else}
		<DataList
			rows={list.visible}
			{columns}
			getKey={(r) => r.playerId}
			{isExpanded}
			{trailing}
			{expanded}
			data-testid="{testIdPrefix}-table"
		/>

		{#if list.hiddenCount > 0 && !list.showAll}
			<div class="mt-4 text-center">
				<Button
					variant="outline"
					data-testid="{testIdPrefix}-show-all"
					onclick={() => (list.showAll = true)}
				>
					Show all {list.filtered.length} players
				</Button>
			</div>
		{/if}
	{/if}
{/if}
