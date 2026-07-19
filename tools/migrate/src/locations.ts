import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface MappedLocation {
	city: string;
	country: string;
	latitude: number;
	longitude: number;
}

// Keyed by the exact legacy `events.location` string; null = geocoding found
// nothing (fix by hand or leave null to migrate without a map location).
export type LocationMap = Record<string, MappedLocation | null>;

const FILE = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
	'data',
	'event-locations.json'
);

export function loadLocationMap(): LocationMap {
	if (!fs.existsSync(FILE)) return {};
	return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

export function saveLocationMap(map: LocationMap): void {
	const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
	fs.mkdirSync(path.dirname(FILE), { recursive: true });
	fs.writeFileSync(FILE, JSON.stringify(sorted, null, 2) + '\n');
}
