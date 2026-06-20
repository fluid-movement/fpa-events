<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import { onMount } from 'svelte';
	import { autocomplete, type GeocodingResult } from '$lib/geocoding';
	import type { Map, Marker } from 'leaflet';

	type Props = {
		name?: string;
		lat?: number;
		lng?: number;
		address?: string;
	};

	let { name = $bindable(''), lat = $bindable(51.505), lng = $bindable(-0.09), address = $bindable('') }: Props = $props();

	// Geocoding typeahead state
	let query = $state('');
	let suggestions = $state<GeocodingResult[]>([]);
	let isOpen = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let wrapper: HTMLDivElement | null = $state(null);

	// Editable name state seeded from prop
	let nameValue = $state(name ?? '');
	let addressValue = $state(address ?? '');
	let latValue = $state(lat ?? 51.505);
	let lngValue = $state(lng ?? -0.09);

	// Map state
	let mapContainer: HTMLDivElement | null = $state(null);
	let mapInstance: Map | null = null;
	let markerInstance: Marker | null = null;

	function handleInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		query = target.value;

		if (!query.trim()) {
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
		query = result.displayName;
		addressValue = result.displayName;

		if (!nameValue) {
			nameValue = result.name ?? result.displayName;
		}

		latValue = result.lat;
		lngValue = result.lng;

		suggestions = [];
		isOpen = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isOpen = false;
		}
	}

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

	// Sync map marker when lat/lng change from geocoding selection
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
			// @ts-ignore
			delete L.Icon.Default.prototype._getIconUrl;
			L.Icon.Default.mergeOptions({
				iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
				iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
				shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href
			});

			const map = L.map(mapContainer).setView([latValue, lngValue], 13);

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
		<div bind:this={wrapper} class="relative">
			<div role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-controls="venue-search-listbox" aria-owns="venue-search-listbox">
				<input
					id="venue-search"
					type="text"
					value={query}
					oninput={handleInput}
					onkeydown={handleKeydown}
					placeholder="Search for a venue or address..."
					autocomplete="off"
					aria-autocomplete="list"
					aria-controls="venue-search-listbox"
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			{#if isOpen && suggestions.length > 0}
				<ul
					id="venue-search-listbox"
					role="listbox"
					class="absolute z-50 mt-1 w-full rounded-md border border-border bg-white shadow-md"
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
			class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
		/>
	</div>

	<!-- Map -->
	<div class="flex flex-col gap-1">
		<span class="text-sm font-medium text-foreground">Pin location</span>
		<p class="text-xs text-muted-foreground">Drag the pin to adjust the exact location.</p>
		<div bind:this={mapContainer} class="h-64 w-full rounded-md overflow-hidden"></div>
	</div>

	<!-- Hidden fields for form submission -->
	<input type="hidden" name="address" value={addressValue} />
	<input type="hidden" name="latitude" value={latValue} />
	<input type="hidden" name="longitude" value={lngValue} />
</div>
