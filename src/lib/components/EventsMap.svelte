<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import type { Map as LeafletMap } from 'leaflet';
	import { SvelteMap } from 'svelte/reactivity';

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

	type Props = { events: MapEvent[] };

	let { events }: Props = $props();

	let mapContainer: HTMLDivElement | null = $state(null);
	let mapInstance: LeafletMap | null = null;

	const locatedEvents = $derived(events.filter((e) => e.latitude != null && e.longitude != null));
	const hasLocatedEvents = $derived(locatedEvents.length > 0);

	function formatDateRange(start: Date, end: Date): string {
		const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
		const s = new Date(start).toLocaleDateString('en-US', opts);
		const e = new Date(end).toLocaleDateString('en-US', opts);
		return new Date(start).toDateString() === new Date(end).toDateString() ? s : `${s} – ${e}`;
	}

	function buildPopupHtml(group: MapEvent[]): string {
		return group
			.map((ev, i) => {
				// Leaflet builds popups from an HTML string, so these can't be Tailwind
				// classes — they read the theme tokens directly rather than the
				// light-theme hexes they used to hard-code.
				const border =
					i > 0 ? 'border-top:1px solid var(--border);padding-top:8px;margin-top:8px;' : '';
				const muted = 'color:var(--muted-foreground);font-size:0.8rem;margin:0 0 4px';
				return `
				<div style="${border}">
					<p style="font-weight:600;margin:0 0 2px">${ev.name}</p>
					<p style="${muted}">${formatDateRange(ev.startDate, ev.endDate)}</p>
					${ev.location ? `<p style="${muted}">${ev.location}</p>` : ''}
					<a href="${resolve(`/events/${ev.id}`)}" style="color:var(--primary);font-size:0.8rem;text-decoration:none;">View event →</a>
				</div>`;
			})
			.join('');
	}

	onMount(() => {
		if (!hasLocatedEvents) return;
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

			// Start with dragging off on touch devices. Leaflet only adds the
			// `leaflet-touch-drag` class (and its `touch-action: none`) while dragging is
			// enabled, and browsers latch `touch-action` at gesture start — so enabling it
			// here would swallow the very first one-finger swipe after load: the map
			// wouldn't pan and the page wouldn't scroll. The touchstart handler below
			// enables it as soon as a second finger lands.
			const isTouch = 'ontouchstart' in window;
			const map = L.map(mapContainer, { zoomControl: true, dragging: !isTouch });

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			}).addTo(map);

			// Group events by eventLocationId (or fall back to stringified coords for events without one)
			const groups = new SvelteMap<string, MapEvent[]>();
			for (const ev of locatedEvents) {
				const key =
					ev.eventLocationId != null
						? `loc:${ev.eventLocationId}`
						: `coord:${ev.latitude},${ev.longitude}`;
				const existing = groups.get(key);
				if (existing) existing.push(ev);
				else groups.set(key, [ev]);
			}

			const markers: ReturnType<typeof L.marker>[] = [];

			for (const group of groups.values()) {
				const { latitude, longitude } = group[0];
				const marker = L.marker([latitude!, longitude!])
					.bindPopup(
						`<div style="min-width:180px;font-size:0.85rem;line-height:1.4">${buildPopupHtml(group)}</div>`,
						{ maxWidth: 280 }
					)
					.addTo(map);
				markers.push(marker);
			}

			if (markers.length >= 2) {
				const group = L.featureGroup(markers);
				map.fitBounds(group.getBounds(), { padding: [40, 40] });
			} else if (markers.length === 1) {
				const { latitude, longitude } = locatedEvents[0];
				map.setView([latitude!, longitude!], 8);
			}

			mapInstance = map;

			// Allow the page to scroll on touch devices — two fingers to pan the map
			if (isTouch) {
				const container = map.getContainer();
				let twoFingers = false;

				container.addEventListener(
					'touchstart',
					(e) => {
						twoFingers = e.touches.length >= 2;
						if (twoFingers) {
							map.dragging.enable();
							map.touchZoom.enable();
						} else {
							map.dragging.disable();
						}
					},
					{ passive: true }
				);

				container.addEventListener(
					'touchmove',
					(e) => {
						if (e.touches.length >= 2 && !twoFingers) {
							twoFingers = true;
							map.dragging.enable();
							map.touchZoom.enable();
						}
					},
					{ passive: true }
				);

				container.addEventListener(
					'touchend',
					() => {
						if (twoFingers) {
							map.dragging.disable();
							twoFingers = false;
						}
					},
					{ passive: true }
				);

				container.addEventListener(
					'touchcancel',
					() => {
						map.dragging.disable();
						twoFingers = false;
					},
					{ passive: true }
				);
			}
		});

		return () => {
			destroyed = true;
			if (mapInstance) {
				mapInstance.remove();
				mapInstance = null;
			}
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
