<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import { onMount } from 'svelte';
	import type { Map as LeafletMap, Marker } from 'leaflet';
	import { addOsmTiles, enableTwoFingerPan, isTouchDevice, loadLeaflet } from '#lib/leaflet';
	import { groupBy } from '#lib/utils/collections';
	import { buildPopupHtml } from '#lib/utils/mapPopup';

	type MapEvent = {
		id: string;
		name: string;
		startDate: Date;
		endDate: Date;
		location: string | null;
		eventLocationId: number | null;
		latitude: number | null;
		longitude: number | null;
	};

	/** An event that has coordinates — the only kind this map can plot. */
	type LocatedEvent = MapEvent & { latitude: number; longitude: number };

	let { events }: { events: MapEvent[] } = $props();

	let mapContainer: HTMLDivElement | null = $state(null);

	const locatedEvents = $derived(
		events.filter((e): e is LocatedEvent => e.latitude != null && e.longitude != null)
	);
	const hasLocatedEvents = $derived(locatedEvents.length > 0);

	onMount(() => {
		if (!hasLocatedEvents) return;

		let map: LeafletMap | null = null;
		let destroyed = false;

		loadLeaflet().then((L) => {
			if (destroyed || !mapContainer) return;

			// Dragging starts off on touch devices; see `enableTwoFingerPan`.
			const touch = isTouchDevice();
			map = L.map(mapContainer, { zoomControl: true, dragging: !touch });
			addOsmTiles(L, map);

			// Events sharing a city get one marker with a combined popup. Events with
			// no shared location fall back to their exact coordinates as the key.
			const groups = groupBy(locatedEvents, (ev) =>
				ev.eventLocationId != null
					? `loc:${ev.eventLocationId}`
					: `coord:${ev.latitude},${ev.longitude}`
			);

			const markers: Marker[] = [];
			for (const group of groups.values()) {
				const { latitude, longitude } = group[0];
				markers.push(
					L.marker([latitude, longitude])
						.bindPopup(buildPopupHtml(group), { maxWidth: 280 })
						.addTo(map)
				);
			}

			if (markers.length >= 2) {
				map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [40, 40] });
			} else {
				const { latitude, longitude } = locatedEvents[0];
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

{#if hasLocatedEvents}
	<section>
		<h2 class="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
			Where in the world
		</h2>
		<div
			bind:this={mapContainer}
			class="relative z-0 h-72 w-full overflow-hidden rounded-xl border md:h-96"
		></div>
	</section>
{/if}
