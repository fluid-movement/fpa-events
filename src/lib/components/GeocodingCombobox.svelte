<script lang="ts">
	import { untrack } from 'svelte';
	import { autocomplete, type GeocodingResult } from '#lib/geocoding';
	import { Input } from '#lib/components/ui/input';

	type Props = {
		/** Initial text. Not reactive — after mount the field is the source of truth. */
		value?: string;
		/** Id for the input, so a caller's own <label> can point at it. */
		id?: string;
		placeholder?: string;
		inputClass?: string;
		onSelect: (result: GeocodingResult) => void;
		onClear?: () => void;
		getDisplayValue?: (result: GeocodingResult) => string;
	};

	let {
		value = '',
		id,
		placeholder = 'Search...',
		inputClass = '',
		onSelect,
		onClear,
		getDisplayValue
	}: Props = $props();

	// Deliberately a one-time seed: once mounted the field owns its own text, and
	// re-syncing from the prop would fight the user mid-type.
	let query = $state(untrack(() => value));
	let suggestions = $state<GeocodingResult[]>([]);
	let isOpen = $state(false);
	let activeIndex = $state(-1);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let requestId = 0; // incremented on every fetch; stale responses are discarded
	let wrapper: HTMLDivElement | null = $state(null);

	function handleInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		query = target.value;

		if (!query.trim()) {
			suggestions = [];
			isOpen = false;
			activeIndex = -1;
			requestId++; // invalidate any in-flight request
			onClear?.();
			return;
		}

		if (debounceTimer !== null) clearTimeout(debounceTimer);

		// Reopen immediately with cached results while new fetch debounces
		if (suggestions.length > 0) {
			isOpen = true;
		}

		const id = ++requestId;
		debounceTimer = setTimeout(async () => {
			const results = await autocomplete(query);
			if (id !== requestId) return; // stale response — a newer request is in flight
			suggestions = results;
			isOpen = results.length > 0;
			activeIndex = results.length > 0 ? 0 : -1;
		}, 300);
	}

	function selectSuggestion(result: GeocodingResult) {
		query = getDisplayValue ? getDisplayValue(result) : result.displayName;
		onSelect(result);
		suggestions = [];
		isOpen = false;
		activeIndex = -1;
		requestId++;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (isOpen) {
				// Close popup but keep whatever the user typed; discard in-flight request
				isOpen = false;
				activeIndex = -1;
				requestId++;
			} else {
				// Popup already closed — clear the field and the selection
				query = '';
				requestId++;
				onClear?.();
			}
			event.preventDefault();
			return;
		}

		if (!isOpen) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			activeIndex = Math.min(activeIndex + 1, suggestions.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			activeIndex = Math.max(activeIndex - 1, 0);
		} else if (event.key === 'Enter') {
			if (activeIndex >= 0 && suggestions[activeIndex]) {
				event.preventDefault();
				selectSuggestion(suggestions[activeIndex]);
			}
		}
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
		<Input
			{id}
			type="text"
			value={query}
			oninput={handleInput}
			onkeydown={handleKeydown}
			{placeholder}
			autocomplete="off"
			aria-autocomplete="list"
			aria-controls="geocoding-listbox"
			aria-activedescendant={activeIndex >= 0 ? `geocoding-option-${activeIndex}` : undefined}
			class={inputClass}
		/>
	</div>

	{#if isOpen && suggestions.length > 0}
		<ul
			id="geocoding-listbox"
			role="listbox"
			class="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md"
		>
			{#each suggestions as suggestion, i (suggestion.displayName + suggestion.lat + suggestion.lng)}
				<li id="geocoding-option-{i}" role="option" aria-selected={i === activeIndex}>
					<button
						type="button"
						class="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none {i ===
						activeIndex
							? 'bg-accent text-accent-foreground'
							: ''}"
						onclick={() => selectSuggestion(suggestion)}
					>
						{suggestion.displayName}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
