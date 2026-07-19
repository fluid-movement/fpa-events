// Step 1: build/refresh data/event-locations.json from the distinct legacy
// event location strings. Only strings missing from the file are geocoded
// (via Photon, the same service the app uses), so hand corrections survive
// re-runs. Review the file before running the migration.
import { legacyPool } from './db';
import { loadLocationMap, saveLocationMap, type MappedLocation } from './locations';

const PHOTON_URL = 'https://photon.komoot.io/api/';

interface PhotonFeature {
	geometry: { coordinates: [number, number] };
	properties: { name?: string; city?: string; country?: string };
}

async function geocode(query: string): Promise<MappedLocation | null> {
	const url = new URL(PHOTON_URL);
	url.searchParams.set('q', query);
	url.searchParams.set('limit', '1');
	const res = await fetch(url.toString());
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
	const legacy = legacyPool();
	const { rows } = await legacy.query<{ location: string }>(
		`SELECT DISTINCT location FROM events WHERE location IS NOT NULL AND btrim(location) <> '' ORDER BY location`
	);
	await legacy.end();

	const map = loadLocationMap();
	const missing = rows.map((r) => r.location).filter((loc) => !(loc in map));
	console.log(
		`${rows.length} distinct legacy locations, ${missing.length} not yet in the mapping file.`
	);

	let unresolved = 0;
	for (const [i, location] of missing.entries()) {
		const result = await geocode(location);
		map[location] = result;
		if (result) {
			console.log(
				`  [${i + 1}/${missing.length}] "${location}" → ${result.city}, ${result.country}`
			);
		} else {
			unresolved++;
			console.log(
				`  [${i + 1}/${missing.length}] "${location}" → no result (left null, fix by hand)`
			);
		}
		if (i < missing.length - 1) await sleep(1100); // stay polite to the public Photon instance
	}

	saveLocationMap(map);
	const nulls = Object.values(map).filter((v) => v === null).length;
	console.log(
		`Done. Mapping file has ${Object.keys(map).length} entries, ${nulls} unresolved (null).`
	);
	if (unresolved > 0)
		console.log('Review data/event-locations.json and fill in null entries manually if possible.');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
