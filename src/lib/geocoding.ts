const PHOTON_URL = 'https://photon.komoot.io/api/';

export interface GeocodingResult {
	displayName: string;
	name: string | null;
	city: string | null;
	country: string | null;
	lat: number;
	lng: number;
}

interface PhotonFeature {
	geometry: { coordinates: [number, number] };
	properties: {
		name?: string;
		city?: string;
		country?: string;
		state?: string;
		postcode?: string;
		street?: string;
		housenumber?: string;
	};
}

function buildDisplayName(props: PhotonFeature['properties']): string {
	const parts: string[] = [];
	if (props.name) parts.push(props.name);
	if (props.street) {
		const street = props.housenumber ? `${props.street} ${props.housenumber}` : props.street;
		if (!parts.includes(street)) parts.push(street);
	}
	if (props.city) parts.push(props.city);
	if (props.country) parts.push(props.country);
	return parts.join(', ');
}

function featureToResult(feature: PhotonFeature): GeocodingResult {
	const [lng, lat] = feature.geometry.coordinates;
	const props = feature.properties;
	return {
		displayName: buildDisplayName(props),
		name: props.name ?? null,
		city: props.city ?? null,
		country: props.country ?? null,
		lat,
		lng
	};
}

export async function autocomplete(query: string, limit = 5): Promise<GeocodingResult[]> {
	if (!query.trim()) return [];
	const url = new URL(PHOTON_URL);
	url.searchParams.set('q', query);
	url.searchParams.set('limit', String(limit));

	const res = await fetch(url.toString());
	if (!res.ok) return [];

	const data = await res.json();
	return ((data.features as PhotonFeature[] | undefined) ?? []).map(featureToResult);
}
