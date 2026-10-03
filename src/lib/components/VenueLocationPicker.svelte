<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import { onMount, untrack } from 'svelte';
	import type { GeocodingResult } from '#lib/geocoding';
	import type { Map as LeafletMap, Marker } from 'leaflet';
	import { addOsmTiles, loadLeaflet } from '#lib/leaflet';
	import GeocodingCombobox from './GeocodingCombobox.svelte';
	import type { RemoteFormFields } from '$app/server';

	/** Central London — a neutral starting view when the event has no position. */
	const FALLBACK_POSITION = { lat: 51.505, lng: -0.09 };

	/** The subset of the event-location form this picker writes. */
	type VenueFields = {
		name: string;
		address?: string;
		latitude?: string;
		longitude?: string;
	};

	type Props = {
		// SvelteKit 3 rejects form fields not built by `fields.<name>.as(...)`,
		// so the owning form hands its fields down.
		fields: RemoteFormFields<VenueFields>;
		/** Starting values only; the fields below are the source of truth after mount. */
		name?: string;
		address?: string;
		lat?: number;
		lng?: number;
	};

	let {
		fields,
		name = '',
		address = '',
		lat = FALLBACK_POSITION.lat,
		lng = FALLBACK_POSITION.lng
	}: Props = $props();

	// Seeded once. The inputs and the map pin own these from mount onwards, so
	// tracking the props would undo whatever the organizer just did.
	let nameValue = $state(untrack(() => name));
	let addressValue = $state(untrack(() => address));
	let latValue = $state(untrack(() => lat));
	let lngValue = $state(untrack(() => lng));

	let mapContainer: HTMLDivElement | null = $state(null);
	let map: LeafletMap | null = $state(null);
	let marker: Marker | null = $state(null);

	function handleSelect(result: GeocodingResult) {
		addressValue = result.displayName;
		if (!nameValue) nameValue = result.name ?? result.displayName;
		latValue = result.lat;
		lngValue = result.lng;
	}

	// Follow the coordinates wherever they come from — a search hit or a pin drag.
	$effect(() => {
		const position: [number, number] = [latValue, lngValue];
		if (!map || !marker) return;
		marker.setLatLng(position);
		map.setView(position, map.getZoom());
	});

	onMount(() => {
		let destroyed = false;

		loadLeaflet().then((L) => {
			if (destroyed || !mapContainer) return;

			const instance = L.map(mapContainer).setView([latValue, lngValue], 13);
			addOsmTiles(L, instance);

			const pin = L.marker([latValue, lngValue], { draggable: true }).addTo(instance);
			pin.on('dragend', () => {
				const position = pin.getLatLng();
				latValue = position.lat;
				lngValue = position.lng;
			});

			map = instance;
			marker = pin;
		});

		return () => {
			destroyed = true;
			map?.remove();
			map = null;
			marker = null;
		};
	});
</script>

<div class="flex flex-col gap-4">
	<!-- Address search / geocoding typeahead -->
	<div class="flex flex-col gap-1">
		<label for="venue-search" class="text-sm font-medium text-foreground">Search address</label>
		<GeocodingCombobox
			id="venue-search"
			value={addressValue}
			placeholder="Search for a venue or address..."
			inputClass="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
			onSelect={handleSelect}
			onClear={() => (addressValue = '')}
		/>
	</div>

	<!-- Venue name input -->
	<div class="flex flex-col gap-1">
		<label for="venue-name" class="text-sm font-medium text-foreground">Venue name</label>
		<input
			id="venue-name"
			placeholder="e.g. Central Park, Disc Golf Field 3"
			{...fields.name.as('text', nameValue)}
			class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
		/>
	</div>

	<!-- Map -->
	<div class="flex flex-col gap-1">
		<span class="text-sm font-medium text-foreground">Pin location</span>
		<p class="text-xs text-muted-foreground">Drag the pin to adjust the exact location.</p>
		<div bind:this={mapContainer} class="h-96 w-full overflow-hidden rounded-md"></div>
	</div>

	<!-- Hidden fields for form submission -->
	<input {...fields.address.as('hidden', addressValue)} />
	<input {...fields.latitude.as('hidden', String(latValue))} />
	<input {...fields.longitude.as('hidden', String(lngValue))} />
</div>
