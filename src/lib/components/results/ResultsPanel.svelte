<script lang="ts">
	import ServiceUnavailable from '$lib/components/layout/ServiceUnavailable.svelte';
	import Pagination from '$lib/components/layout/Pagination.svelte';
	import ResultsFilters from './ResultsFilters.svelte';
	import ResultEventList from './ResultEventList.svelte';
	import { getResultEvents } from '$lib/api/results.remote';
	import { PAGE_SIZE } from '$lib/results/types';

	let {
		q,
		division,
		year,
		page,
		onSearch,
		onDivision,
		onYear,
		pageHref
	}: {
		q: string;
		division: string | undefined;
		year: number | undefined;
		page: number;
		onSearch: (value: string) => void;
		onDivision: (value: string | undefined) => void;
		onYear: (value: number | undefined) => void;
		pageHref: (page: number) => string;
	} = $props();

	const view = $derived(await getResultEvents({ q: q || undefined, division, year, page }));
</script>

{#if !view.ok}
	<ServiceUnavailable
		title="Results are temporarily unavailable"
		message={view.message}
		testId="results-unavailable"
	/>
{:else}
	<ResultsFilters
		{q}
		{division}
		{year}
		years={view.data.facets.years}
		divisions={view.data.facets.divisions}
		{onSearch}
		{onDivision}
		{onYear}
	/>

	<ResultEventList rows={view.data.rows} />

	<Pagination
		page={view.data.page}
		pageCount={view.data.pageCount}
		total={view.data.total}
		pageSize={PAGE_SIZE}
		hrefFor={pageHref}
		noun="events"
		data-testid="results-pagination"
	/>
{/if}
