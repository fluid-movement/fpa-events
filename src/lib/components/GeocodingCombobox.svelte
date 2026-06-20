<script lang="ts">
	import { autocomplete, type GeocodingResult } from '$lib/geocoding';

	type Props = {
		value?: string;
		placeholder?: string;
		inputClass?: string;
		onSelect: (result: GeocodingResult) => void;
		getDisplayValue?: (result: GeocodingResult) => string;
	};

	let {
		value = '',
		placeholder = 'Search...',
		inputClass = '',
		onSelect,
		getDisplayValue
	}: Props = $props();

	// Seed query from prop on mount only; after that it's driven by user input
	let query = $state((() => value)());
	let suggestions = $state<GeocodingResult[]>([]);
	let isOpen = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let wrapper: HTMLDivElement | null = $state(null);

	function handleInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		query = target.value;

		if (!query.trim()) {
			suggestions = [];
			isOpen = false;
			return;
		}

		if (debounceTimer !== null) clearTimeout(debounceTimer);

		debounceTimer = setTimeout(async () => {
			const results = await autocomplete(query);
			suggestions = results;
			isOpen = results.length > 0;
		}, 300);
	}

	function selectSuggestion(result: GeocodingResult) {
		query = getDisplayValue ? getDisplayValue(result) : result.displayName;
		onSelect(result);
		suggestions = [];
		isOpen = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') isOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		if (!wrapper?.contains(event.target as Node)) isOpen = false;
	}

	$effect(() => {
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<div bind:this={wrapper} class="relative">
	<div
		role="combobox"
		aria-expanded={isOpen}
		aria-haspopup="listbox"
		aria-controls="geocoding-listbox"
		aria-owns="geocoding-listbox"
	>
		<input
			type="text"
			value={query}
			oninput={handleInput}
			onkeydown={handleKeydown}
			{placeholder}
			autocomplete="off"
			aria-autocomplete="list"
			aria-controls="geocoding-listbox"
			class={inputClass}
		/>
	</div>

	{#if isOpen && suggestions.length > 0}
		<ul
			id="geocoding-listbox"
			role="listbox"
			class="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md"
		>
			{#each suggestions as suggestion (suggestion.displayName + suggestion.lat + suggestion.lng)}
				<li role="option" aria-selected="false">
					<button
						type="button"
						class="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
						onclick={() => selectSuggestion(suggestion)}
					>
						{suggestion.displayName}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
