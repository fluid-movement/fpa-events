<script lang="ts">
	import type { GeocodingResult } from '$lib/geocoding';
	import GeocodingCombobox from './GeocodingCombobox.svelte';

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

	let selected = $state<GeocodingResult | null>(null);

	let hiddenLocation = $derived(
		selected
			? [selected.city ?? selected.name, selected.country].filter(Boolean).join(', ')
			: locationValue || value
	);
	let hiddenCity = $derived(selected ? (selected.city ?? selected.name ?? '') : city);
	let hiddenCountry = $derived(selected ? (selected.country ?? '') : country);
	let hiddenLatitude = $derived(selected ? selected.lat : (latitude ?? null));
	let hiddenLongitude = $derived(selected ? selected.lng : (longitude ?? null));

	function handleSelect(result: GeocodingResult) {
		selected = result;
	}

	function handleClear() {
		selected = null;
	}

	function getDisplayValue(result: GeocodingResult): string {
		const parts = [result.city ?? result.name, result.country].filter(Boolean);
		return parts.length > 0 ? parts.join(', ') : result.displayName;
	}
</script>

<div class="relative">
	<GeocodingCombobox
		{value}
		placeholder="Search for a city..."
		onSelect={handleSelect}
		onClear={handleClear}
		{getDisplayValue}
	/>

	<!-- Hidden fields populated on selection -->
	<input type="hidden" name="location" value={hiddenLocation} />
	<input type="hidden" name="city" value={hiddenCity} />
	<input type="hidden" name="country" value={hiddenCountry} />
	<input type="hidden" name="latitude" value={hiddenLatitude ?? ''} />
	<input type="hidden" name="longitude" value={hiddenLongitude ?? ''} />
</div>
