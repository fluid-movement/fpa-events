<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import { onMount } from 'svelte';
	import type { GeocodingResult } from '$lib/geocoding';
	import type { Map, Marker } from 'leaflet';
	import GeocodingCombobox from './GeocodingCombobox.svelte';

	type Props = {
		name?: string;
		lat?: number;
		lng?: number;
		address?: string;
	};

	let {
		name = $bindable(''),
		lat = $bindable(51.505),
		lng = $bindable(-0.09),
		address = $bindable('')
	}: Props = $props();

	let nameValue = $state(name ?? '');
	let addressValue = $state(address ?? '');
	let latValue = $state(lat ?? 51.505);
	let lngValue = $state(lng ?? -0.09);

	let mapContainer: HTMLDivElement | null = $state(null);
	let mapInstance: Map | null = null;
	let markerInstance: Marker | null = null;

	function handleSelect(result: GeocodingResult) {
		addressValue = result.displayName;
		if (!nameValue) nameValue = result.name ?? result.displayName;
		latValue = result.lat;
		lngValue = result.lng;
	}

	function handleClear() {
		addressValue = '';
	}

	$effect(() => {
		const currentLat = latValue;
		const currentLng = lngValue;
		if (!mapInstance || !markerInstance) return;
		markerInstance.setLatLng([currentLat, currentLng]);
		mapInstance.setView([currentLat, currentLng], mapInstance.getZoom());
	});

	onMount(() => {
		let destroyed = false;

		import('leaflet').then((L) => {
			if (destroyed || !mapContainer) return;

			// Fix broken default icon paths in Vite/bundler environments
			// @ts-expect-error - _getIconUrl is a private Leaflet property not in the types
			delete L.Icon.Default.prototype._getIconUrl;
			L.Icon.Default.mergeOptions({
				iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
				iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
				shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href
			});

			const map = L.map(mapContainer).setView([latValue, lngValue], 13);

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			}).addTo(map);

			const marker = L.marker([latValue, lngValue], { draggable: true }).addTo(map);

			marker.on('dragend', () => {
				const pos = marker.getLatLng();
				latValue = pos.lat;
				lngValue = pos.lng;
			});

			mapInstance = map;
			markerInstance = marker;
		});

		return () => {
			destroyed = true;
			if (mapInstance) {
				mapInstance.remove();
				mapInstance = null;
				markerInstance = null;
			}
		};
	});
</script>

<div class="flex flex-col gap-4">
	<!-- Address search / geocoding typeahead -->
	<div class="flex flex-col gap-1">
		<label for="venue-search" class="text-sm font-medium text-foreground">Search address</label>
		<GeocodingCombobox
			value={addressValue}
			placeholder="Search for a venue or address..."
			inputClass="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
			onSelect={handleSelect}
			onClear={handleClear}
		/>
	</div>

	<!-- Venue name input -->
	<div class="flex flex-col gap-1">
		<label for="venue-name" class="text-sm font-medium text-foreground">Venue name</label>
		<input
			id="venue-name"
			type="text"
			name="name"
			bind:value={nameValue}
			placeholder="e.g. Central Park, Disc Golf Field 3"
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
	<input type="hidden" name="address" value={addressValue} />
	<input type="hidden" name="latitude" value={latValue} />
	<input type="hidden" name="longitude" value={lngValue} />
</div>
