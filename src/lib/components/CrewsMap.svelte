<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import { onMount } from 'svelte';
	import type { Map as LeafletMap, Marker } from 'leaflet';
	import { addOsmTiles, enableTwoFingerPan, isTouchDevice, loadLeaflet } from '#lib/leaflet';
	import { buildCrewPopupHtml } from '#lib/utils/mapPopup';

	type MapCrew = {
		id: string;
		name: string;
		city: string;
		country: string;
		latitude: number;
		longitude: number;
	};
	let { crews }: { crews: MapCrew[] } = $props();
	let mapContainer: HTMLDivElement | null = $state(null);
	const locatedCrews = $derived(
		crews.filter((crew) => Number.isFinite(crew.latitude) && Number.isFinite(crew.longitude))
	);
	const hasLocatedCrews = $derived(locatedCrews.length > 0);

	onMount(() => {
		if (!hasLocatedCrews) return;

		let map: LeafletMap | null = null;
		let destroyed = false;

		loadLeaflet().then((L) => {
			if (destroyed || !mapContainer) return;

			// Dragging starts off on touch devices; see `enableTwoFingerPan`.
			const touch = isTouchDevice();
			map = L.map(mapContainer, { zoomControl: true, dragging: !touch });
			addOsmTiles(L, map);

			const markers: Marker[] = [];
			for (const crew of locatedCrews) {
				markers.push(
					L.marker([crew.latitude, crew.longitude], { title: crew.name })
						.bindPopup(buildCrewPopupHtml(crew), { maxWidth: 280 })
						.addTo(map)
				);
			}

			if (markers.length >= 2) {
				map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [40, 40] });
			} else {
				const { latitude, longitude } = locatedCrews[0];
				map.setView([latitude, longitude], 8);
			}

			if (touch) enableTwoFingerPan(map);
		});

		return () => {
			destroyed = true;
			map?.remove();
			map = null;
		};
	});
</script>

{#if hasLocatedCrews}
	<section aria-label="Crew map">
		<h2 class="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
			Crews around the world
		</h2>
		<div
			data-testid="crews-map"
			bind:this={mapContainer}
			class="relative z-0 h-72 w-full overflow-hidden rounded-xl border md:h-96"
		></div>
	</section>
{/if}
