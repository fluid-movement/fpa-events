<script lang="ts">
	import { autocomplete, type GeocodingResult } from '$lib/geocoding';
	import Input from '$lib/components/ui/input/input.svelte';

	type Props = {
		value?: string;
		locationValue?: string;
		city?: string;
		country?: string;
		latitude?: number | null;
		longitude?: number | null;
	};

	let {
		value = '',
		locationValue = '',
		city = '',
		country = '',
		latitude = null,
		longitude = null
	}: Props = $props();

	// Seed the visible input from the prop only on mount; after that it's
	// independent mutable state driven by user typing / selection.
	let query: string = $state((() => value)());
	let suggestions = $state<GeocodingResult[]>([]);
	let isOpen = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Track whether the user has made a selection; before selection, hidden fields
	// reflect the incoming props so edit forms pre-populate correctly.
	let selected = $state<GeocodingResult | null>(null);

	let hiddenLocation = $derived(
		selected
			? [selected.city ?? selected.name, selected.country].filter(Boolean).join(', ')
			: (locationValue || value)
	);
	let hiddenCity = $derived(selected ? (selected.city ?? selected.name ?? '') : city);
	let hiddenCountry = $derived(selected ? (selected.country ?? '') : country);
	let hiddenLatitude = $derived(selected ? selected.lat : (latitude ?? null));
	let hiddenLongitude = $derived(selected ? selected.lng : (longitude ?? null));

	function clearSelection() {
		selected = null;
	}

	function handleInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		query = target.value;

		if (!query) {
			clearSelection();
			suggestions = [];
			isOpen = false;
			return;
		}

		if (debounceTimer !== null) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(async () => {
			const results = await autocomplete(query);
			suggestions = results;
			isOpen = results.length > 0;
		}, 300);
	}

	function selectSuggestion(result: GeocodingResult) {
		const parts = [result.city ?? result.name, result.country].filter(Boolean);
		query = parts.length > 0 ? parts.join(', ') : result.displayName;
		selected = result;
		suggestions = [];
		isOpen = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isOpen = false;
		}
	}

	let wrapper: HTMLDivElement | null = $state(null);

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Node;
		if (!wrapper?.contains(target)) {
			isOpen = false;
		}
	}

	$effect(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div bind:this={wrapper} class="relative">
	<Input
		type="text"
		value={query}
		oninput={handleInput}
		onkeydown={handleKeydown}
		placeholder="Search for a city..."
		autocomplete="off"
		aria-autocomplete="list"
		aria-expanded={isOpen}
		aria-haspopup="listbox"
	/>

	{#if isOpen && suggestions.length > 0}
		<ul
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
						{[suggestion.city ?? suggestion.name, suggestion.country].filter(Boolean).join(", ") || suggestion.displayName}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- Hidden fields populated on selection -->
	<input type="hidden" name="location" value={hiddenLocation} />
	<input type="hidden" name="city" value={hiddenCity} />
	<input type="hidden" name="country" value={hiddenCountry} />
	<input type="hidden" name="latitude" value={hiddenLatitude ?? ''} />
	<input type="hidden" name="longitude" value={hiddenLongitude ?? ''} />
</div>
