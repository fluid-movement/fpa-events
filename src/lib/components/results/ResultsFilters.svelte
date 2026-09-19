<script lang="ts">
	import { untrack } from 'svelte';
	import { Input } from '#lib/components/ui/input';
	import * as Select from '#lib/components/ui/select';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

	const ALL = '__all__';

	let {
		q,
		division,
		year,
		years,
		divisions,
		onSearch,
		onDivision,
		onYear
	}: {
		q: string;
		division: string | undefined;
		year: number | undefined;
		years: number[];
		divisions: string[];
		onSearch: (value: string) => void;
		onDivision: (value: string | undefined) => void;
		onYear: (value: number | undefined) => void;
	} = $props();

	// Seeded once, not mirrored: the field must keep whatever is being typed
	// while the debounced navigation catches up behind it.
	let draft = $state(untrack(() => q));
	let input = $state<HTMLInputElement | null>(null);

	// The last value this component put into the URL. Anything else arriving in
	// `q` came from outside — a Back button, or a shared link — and the field
	// has to follow it, which is the one case AGENTS.md keeps an effect for.
	let submitted = untrack(() => q);

	$effect(() => {
		if (q !== submitted) {
			submitted = q;
			draft = q;
		}
	});

	// Search hits the server, so it waits for a pause in typing rather than
	// navigating on every keystroke.
	let timer: ReturnType<typeof setTimeout> | undefined;

	function submit(value: string) {
		submitted = value;
		onSearch(value);
	}

	function onInput(value: string) {
		draft = value;
		clearTimeout(timer);
		timer = setTimeout(() => submit(value.trim()), 300);
	}

	function clear() {
		clearTimeout(timer);
		draft = '';
		submit('');
		input?.focus();
	}

	const divisionValue = $derived(division ?? ALL);
	const yearValue = $derived(year === undefined ? ALL : String(year));
</script>

<div class="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
	<div class="relative flex-1">
		<SearchIcon
			class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
		/>
		<label class="sr-only" for="results-search-input">Search events by name</label>
		<!-- The arbitrary variant suppresses WebKit's own clear button, which
		     would otherwise sit right next to ours. -->
		<Input
			id="results-search-input"
			bind:ref={input}
			value={draft}
			oninput={(e) => onInput(e.currentTarget.value)}
			type="search"
			autocomplete="off"
			placeholder="Search events…"
			class="pr-9 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
			data-testid="results-search"
		/>
		{#if draft}
			<button
				type="button"
				onclick={clear}
				aria-label="Clear search"
				data-testid="results-search-clear"
				class="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			>
				<XIcon class="size-4" />
			</button>
		{/if}
	</div>

	<!-- Keyed so the trigger label follows the URL on back/forward. -->
	{#key divisionValue}
		<Select.Root
			type="single"
			value={divisionValue}
			onValueChange={(v) => onDivision(!v || v === ALL ? undefined : v)}
		>
			<Select.Trigger class="md:w-48" data-testid="results-division">
				{division ?? 'All divisions'}
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					<Select.Item value={ALL}>All divisions</Select.Item>
					{#each divisions as d (d)}
						<Select.Item value={d}>{d}</Select.Item>
					{/each}
				</Select.Group>
			</Select.Content>
		</Select.Root>
	{/key}

	{#key yearValue}
		<Select.Root
			type="single"
			value={yearValue}
			onValueChange={(v) => onYear(!v || v === ALL ? undefined : Number(v))}
		>
			<Select.Trigger class="md:w-32" data-testid="results-year">
				{year ?? 'All years'}
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					<Select.Item value={ALL}>All years</Select.Item>
					{#each years as y (y)}
						<Select.Item value={String(y)}>{y}</Select.Item>
					{/each}
				</Select.Group>
			</Select.Content>
		</Select.Root>
	{/key}
</div>
