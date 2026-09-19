<script lang="ts">
	import type { GeocodingResult } from '#lib/geocoding';
	import type { RemoteFormFields } from '$app/server';
	import type { EventFormData } from '#lib/server/eventForm';
	import GeocodingCombobox from './GeocodingCombobox.svelte';

	type Props = {
		// SvelteKit 3 will not accept a form field that wasn't built by
		// `fields.<name>.as(...)`, so the owning form has to hand its fields down
		// rather than this component naming the inputs itself.
		fields: RemoteFormFields<EventFormData>;
		value?: string;
		locationValue?: string;
		city?: string;
		country?: string;
		latitude?: number | null;
		longitude?: number | null;
	};

	let {
		fields,
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
	<input {...fields.location.as('hidden', hiddenLocation)} />
	<input {...fields.city.as('hidden', hiddenCity)} />
	<input {...fields.country.as('hidden', hiddenCountry)} />
	<input {...fields.latitude.as('hidden', hiddenLatitude === null ? '' : String(hiddenLatitude))} />
	<input
		{...fields.longitude.as('hidden', hiddenLongitude === null ? '' : String(hiddenLongitude))}
	/>
</div>
