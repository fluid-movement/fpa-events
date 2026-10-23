// Step 1: build/refresh data/event-locations.json from the distinct legacy
// event location strings. Only strings missing from the file are geocoded
// (via Photon, the same service the app uses), so hand corrections survive
// re-runs. Review the file before running the migration.
import type pg from 'pg';
import type { LocationMap, MappedLocation } from './locations';

const PHOTON_URL = 'https://photon.komoot.io/api/';

interface PhotonFeature {
	geometry: { coordinates: [number, number] };
	properties: { name?: string; city?: string; country?: string };
}

async function geocode(query: string, photonFetch: typeof fetch): Promise<MappedLocation | null> {
	const url = new URL(PHOTON_URL);
	url.searchParams.set('q', query);
	url.searchParams.set('limit', '1');
	const res = await photonFetch(url.toString());
	if (!res.ok) throw new Error(`Photon request failed for "${query}": ${res.status}`);
	const data = await res.json();
	const feature = (data.features as PhotonFeature[] | undefined)?.[0];
	if (!feature) return null;
	const [longitude, latitude] = feature.geometry.coordinates;
	// For city-level results Photon puts the city in `name`; `city` is only set
	// for results inside a city (streets, venues).
	const city = feature.properties.city ?? feature.properties.name;
	const country = feature.properties.country;
	if (!city || !country) return null;
	return { city, country, latitude, longitude };
}

export async function refreshLocations(
	legacy: Pick<pg.Pool, 'query'>,
	map: LocationMap,
	photonFetch: typeof fetch,
	log: (message: string) => void,
	pause: (ms: number) => Promise<void>
): Promise<number> {
	const { rows } = await legacy.query<{ location: string }>(
		`SELECT DISTINCT location FROM events WHERE location IS NOT NULL AND btrim(location) <> '' ORDER BY location`
	);
	const missing = rows.map((r) => r.location).filter((loc) => !Object.hasOwn(map, loc));
	log(`${rows.length} distinct legacy locations, ${missing.length} not yet in the mapping file.`);

	let unresolved = 0;
	for (const [i, location] of missing.entries()) {
		const result = await geocode(location, photonFetch);
		Object.defineProperty(map, location, {
			value: result,
			enumerable: true,
			writable: true,
			configurable: true
		});
		if (result) {
			log(`  [${i + 1}/${missing.length}] ${JSON.stringify(location)} → ${JSON.stringify(result)}`);
		} else {
			unresolved++;
			log(`  [${i + 1}/${missing.length}] "${location}" → no result (left null, fix by hand)`);
		}
		if (i < missing.length - 1) await pause(1100); // stay polite to the public Photon instance
	}

	const nulls = Object.values(map).filter((v) => v === null).length;
	log(`Done. Mapping file has ${Object.keys(map).length} entries, ${nulls} unresolved (null).`);
	if (unresolved > 0)
		log('Review data/event-locations.json and fill in null entries manually if possible.');
	return missing.length;
}
