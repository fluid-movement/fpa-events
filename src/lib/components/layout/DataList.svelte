<script lang="ts" module>
	import type { Snippet } from 'svelte';

	/**
	 * Where a column goes when the table collapses to one row per record:
	 *
	 *   ┌──────┬────────────────────┬───────┬──────────┐
	 *   │ lead │ primary            │  meta │ trailing │
	 *   │      │ subtitle           │       │          │
	 *   └──────┴────────────────────┴───────┴──────────┘
	 *
	 * Anything left as `detail` is desktop-only — on a phone there is no room for
	 * a fourth number, and hiding it beats a horizontal scrollbar.
	 */
	export type DataSlot = 'lead' | 'primary' | 'subtitle' | 'meta' | 'detail';

	export type DataColumn<T> = {
		header: string;
		value: (row: T) => string | number | null | undefined;
		slot?: DataSlot;
		numeric?: boolean;
		muted?: boolean;
		/** Per-cell class, e.g. the medal tint on a rank. */
		cellClass?: (row: T) => string | undefined;
		headerClass?: string;
		/**
		 * Turns the cell's text into a link. Return undefined for a row that has
		 * nowhere to go, and it stays plain text — a link to nothing is worse
		 * than no link.
		 *
		 * Only the text is wrapped, not the cell, so the row keeps its table
		 * semantics and the rest of the row stays selectable.
		 */
		href?: (row: T) => string | undefined;
	};

	const SLOT_CLASS: Record<DataSlot, string> = {
		lead: 'col-start-1 row-start-1 row-span-2 self-center pr-3 text-right',
		primary: 'col-start-2 row-start-1 min-w-0 font-semibold md:font-medium',
		subtitle: 'col-start-2 row-start-2 min-w-0 text-sm text-muted-foreground md:text-inherit',
		meta: 'col-start-3 row-start-1 row-span-2 self-center pl-3 text-right font-semibold md:font-normal',
		detail: 'hidden md:table-cell'
	};
</script>

<script lang="ts" generics="T">
	import { cn } from '$lib/utils';

	let {
		rows,
		columns,
		getKey,
		empty,
		placeholder = '—',
		class: className,
		'data-testid': testId,
		rowTestId,
		trailing,
		expanded,
		isExpanded
	}: {
		rows: T[];
		columns: DataColumn<T>[];
		getKey: (row: T) => string | number;
		/** Rendered instead of the table when there are no rows. */
		empty?: Snippet;
		placeholder?: string;
		class?: string;
		'data-testid'?: string;
		rowTestId?: (row: T) => string | undefined;
		/** Trailing control per row — expander, remove button. */
		trailing?: Snippet<[T]>;
		/** Detail panel revealed under a row when isExpanded returns true. */
		expanded?: Snippet<[T]>;
		isExpanded?: (row: T) => boolean;
	} = $props();

	const colCount = $derived(columns.length + (trailing ? 1 : 0));

	function text(col: DataColumn<T>, row: T) {
		const v = col.value(row);
		return v === null || v === undefined || v === '' ? placeholder : String(v);
	}
</script>

{#if rows.length === 0 && empty}
	{@render empty()}
{:else}
	<div class={cn('overflow-hidden rounded-xl border', className)}>
		<!-- One DOM tree at every width: below md each row becomes a small grid,
		     above it a plain table. Roles are explicit because `display: grid` on a
		     <tr> drops the implicit table semantics. -->
		<!-- svelte-ignore a11y_no_redundant_roles -->
		<table class="w-full text-sm" role="table" data-testid={testId}>
			<!-- svelte-ignore a11y_no_redundant_roles -->
			<thead class="surface-sunken hidden md:table-header-group" role="rowgroup">
				<!-- svelte-ignore a11y_no_redundant_roles -->
				<tr role="row">
					{#each columns as col (col.header)}
						<th
							scope="col"
							role="columnheader"
							class={cn(
								'px-4 py-2.5 font-medium text-muted-foreground',
								col.numeric ? 'text-right' : 'text-left',
								col.slot === 'detail' && 'hidden md:table-cell',
								col.headerClass
							)}
						>
							{col.header}
						</th>
					{/each}
					{#if trailing}
						<th scope="col" role="columnheader" class="w-12 px-2 py-2.5">
							<span class="sr-only">Actions</span>
						</th>
					{/if}
				</tr>
			</thead>
			<!-- svelte-ignore a11y_no_redundant_roles -->
			<tbody role="rowgroup">
				{#each rows as row (getKey(row))}
					<!-- svelte-ignore a11y_no_redundant_roles -->
					<tr
						role="row"
						data-testid={rowTestId?.(row)}
						class="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center border-t px-3.5 py-2.5 transition-colors md:table-row md:px-0 md:py-0 md:hover:bg-muted/40"
					>
						{#each columns as col (col.header)}
							{@const href = col.href?.(row)}
							<td
								role="cell"
								class={cn(
									'md:table-cell md:px-4 md:py-2.5',
									SLOT_CLASS[col.slot ?? 'detail'],
									col.numeric && 'tabular-nums md:text-right',
									col.muted && 'text-muted-foreground',
									col.cellClass?.(row)
								)}
							>
								{#if href}
									<a {href} class="hover:text-primary hover:underline">{text(col, row)}</a>
								{:else}
									{text(col, row)}
								{/if}
							</td>
						{/each}
						{#if trailing}
							<td
								role="cell"
								class="col-start-4 row-span-2 row-start-1 self-center pl-1 text-right md:table-cell md:px-2 md:py-2.5"
							>
								{@render trailing(row)}
							</td>
						{/if}
					</tr>
					{#if expanded && isExpanded?.(row)}
						<!-- svelte-ignore a11y_no_redundant_roles -->
						<tr role="row" class="block border-t bg-muted/30 md:table-row">
							<td role="cell" colspan={colCount} class="block px-3.5 py-3 md:table-cell md:px-4">
								{@render expanded(row)}
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{/if}
