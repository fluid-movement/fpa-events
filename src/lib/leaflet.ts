import type { Map as LeafletMap } from 'leaflet';

/**
 * Browser-only Leaflet setup, shared by the events map and the venue picker.
 *
 * Leaflet reaches for `window` at import time, so it is always loaded through
 * this dynamic import from inside `onMount` — never as a static import.
 */

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

let iconsPatched = false;

/**
 * Load Leaflet with its marker icons pointing at the bundled assets.
 *
 * Leaflet derives those URLs from the path of its own stylesheet, which a
 * bundler rewrites — so without this every marker renders as a broken image.
 */
export async function loadLeaflet() {
	const L = await import('leaflet');

	if (!iconsPatched) {
		iconsPatched = true;
		// @ts-expect-error — _getIconUrl is a private Leaflet property, not in the types.
		delete L.Icon.Default.prototype._getIconUrl;
		L.Icon.Default.mergeOptions({
			iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
			iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
			shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href
		});
	}

	return L;
}

/** Attach the OpenStreetMap base layer every map in the app uses. */
export function addOsmTiles(L: Awaited<ReturnType<typeof loadLeaflet>>, map: LeafletMap) {
	L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION }).addTo(map);
}

/**
 * Let a one-finger swipe scroll the page and reserve panning for two fingers.
 *
 * Leaflet only adds `leaflet-touch-drag` (and its `touch-action: none`) while
 * dragging is enabled, and browsers latch `touch-action` at gesture start — so
 * a map created with dragging on swallows the first swipe after load: the map
 * does not pan and the page does not scroll. Create the map with
 * `dragging: false` on touch devices and call this instead.
 *
 * Returns a teardown function; `map.remove()` drops the listeners with the
 * container, so callers that destroy the map need not call it.
 */
export function enableTwoFingerPan(map: LeafletMap): () => void {
	const container = map.getContainer();
	let twoFingers = false;

	const onTouchStart = (e: TouchEvent) => {
		twoFingers = e.touches.length >= 2;
		if (twoFingers) {
			map.dragging.enable();
			map.touchZoom.enable();
		} else {
			map.dragging.disable();
		}
	};

	const onTouchMove = (e: TouchEvent) => {
		if (e.touches.length >= 2 && !twoFingers) {
			twoFingers = true;
			map.dragging.enable();
			map.touchZoom.enable();
		}
	};

	const onTouchEnd = () => {
		if (!twoFingers) return;
		map.dragging.disable();
		twoFingers = false;
	};

	const onTouchCancel = () => {
		map.dragging.disable();
		twoFingers = false;
	};

	const listeners = [
		['touchstart', onTouchStart],
		['touchmove', onTouchMove],
		['touchend', onTouchEnd],
		['touchcancel', onTouchCancel]
	] as const;

	for (const [type, handler] of listeners) {
		container.addEventListener(type, handler as EventListener, { passive: true });
	}

	return () => {
		for (const [type, handler] of listeners) {
			container.removeEventListener(type, handler as EventListener);
		}
	};
}

/** True when the device reports touch support, i.e. the pan rules above apply. */
export const isTouchDevice = () => typeof window !== 'undefined' && 'ontouchstart' in window;
