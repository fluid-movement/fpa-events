import type pg from 'pg';
import type { LocationMap, MappedLocation } from './locations';

type Database = Pick<pg.Pool, 'query'>;

/** Independently query the stored rows, rather than trusting INSERT counters. */
export async function verifyDatabase(
	legacy: Database,
	target: Database,
	map: LocationMap,
	publicUrl: string,
	log: (message: string) => void
): Promise<string[]> {
	const errors: string[] = [];
	const count = async (db: Database, sql: string) => {
		const { rows } = await db.query<{ count: number }>(sql);
		return Number(rows[0].count);
	};
	log('DB verification: legacy / expected / target');
	const users = await count(legacy, 'SELECT count(*)::int AS count FROM users');
	const accounts = await count(
		legacy,
		"SELECT count(*)::int AS count FROM users WHERE password IS NOT NULL AND password <> ''"
	);
	const rsvps = await count(legacy, 'SELECT count(*)::int AS count FROM event_user');
	const distinctRsvps = await count(
		legacy,
		'SELECT count(*)::int AS count FROM (SELECT DISTINCT event_id, user_id FROM event_user) AS unique_rsvps'
	);
	const { rows: events } = await legacy.query<{
		id: string;
		location: string | null;
		picture: string | null;
	}>('SELECT id, location, picture FROM events');
	// Deliberately compare fields, independently of the importer's serialized keys.
	const eventLocations: MappedLocation[] = [];
	for (const event of events) {
		const mapped =
			event.location !== null && Object.hasOwn(map, event.location) ? map[event.location] : null;
		if (
			mapped &&
			!eventLocations.some(
				(other) => other.city === mapped.city && other.country === mapped.country
			)
		) {
			eventLocations.push(mapped);
		}
	}
	const { rows: schedules } = await legacy.query<{
		event_id: string;
		location: string | null;
		latitude: number | null;
		longitude: number | null;
	}>('SELECT event_id, location, latitude, longitude FROM schedules');
	const venues: {
		event: string;
		name: string;
		latitude: number | null;
		longitude: number | null;
	}[] = [];
	for (const schedule of schedules) {
		const name = schedule.location?.trim();
		if (!name) continue;
		const hasCoordinates = schedule.latitude !== null && schedule.longitude !== null;
		const venue = {
			event: schedule.event_id,
			name,
			latitude: hasCoordinates ? schedule.latitude : null,
			longitude: hasCoordinates ? schedule.longitude : null
		};
		if (
			!venues.some(
				(other) =>
					other.event === venue.event &&
					other.name === venue.name &&
					other.latitude === venue.latitude &&
					other.longitude === venue.longitude
			)
		)
			venues.push(venue);
	}
	const links = await count(legacy, 'SELECT count(*)::int AS count FROM event_magic_links');
	const tables: [string, number, number][] = [
		['"user"', users, users],
		['account', users, accounts],
		['events', events.length, events.length],
		['event_user', rsvps, distinctRsvps],
		['event_magic_links', links, links],
		['schedules', schedules.length, schedules.length],
		['event_locations', events.length, eventLocations.length],
		['schedule_locations', schedules.length, venues.length]
	];
	log(
		'Expected accounts exclude empty hashes; RSVPs dedupe (event,user); locations dedupe mapped cities and per-event venues.'
	);
	for (const [table, source, expected] of tables) {
		const actual = await count(target, `SELECT count(*)::int AS count FROM ${table}`);
		log(`${table}: ${source} / ${expected} / ${actual}${actual === expected ? '' : ' MISMATCH'}`);
		if (actual !== expected) errors.push(`${table}: expected ${expected}, got ${actual}`);
	}
	const dangling = await count(
		target,
		`SELECT count(*)::int AS count FROM events e
		LEFT JOIN event_locations l ON l.id = e.event_location_id
		WHERE e.event_location_id IS NOT NULL AND l.id IS NULL`
	);
	if (dangling) errors.push(`${dangling} event(s) point to a missing location`);
	const missingVenues = await count(
		target,
		`SELECT count(*)::int AS count FROM schedules s
		LEFT JOIN schedule_locations l ON l.id = s.location_id
		WHERE s.location_id IS NOT NULL AND l.id IS NULL`
	);
	if (missingVenues) errors.push(`${missingVenues} schedule(s) point to a missing location`);

	// Resolve the URL as a browser would, then decode the request pathname once
	// as the object server does. Never use the importer's URL builder as oracle.
	const base = new URL(publicUrl);
	if (
		!['http:', 'https:'].includes(base.protocol) ||
		base.username ||
		base.password ||
		base.search ||
		base.hash
	) {
		throw new Error('Picture public URL must be http(s) without credentials, query or fragment');
	}
	const prefix = `${base.pathname.replace(/\/$/, '')}/`;
	const { rows: targetEvents } = await target.query<{ id: string; picture: string | null }>(
		'SELECT id, picture FROM events'
	);
	const expected = new Map(events.map((event) => [event.id, event.picture]));
	if (targetEvents.length !== events.length)
		errors.push('Event picture row count differs from legacy');
	const keys: string[] = [];
	for (const event of targetEvents) {
		const sourceKey = expected.get(event.id);
		if (!expected.has(event.id)) {
			errors.push(`Unexpected event in picture verification: ${event.id}`);
			continue;
		}
		if (!sourceKey?.trim()) {
			if (event.picture !== null) errors.push(`Expected a blank picture for event ${event.id}`);
			continue;
		}
		try {
			if (!event.picture) throw new Error('missing URL');
			const url = new URL(event.picture);
			if (
				url.origin !== base.origin ||
				url.username ||
				url.password ||
				url.search ||
				url.hash ||
				!url.pathname.startsWith(prefix)
			)
				throw new Error('outside target public URL or contains query/fragment');
			const requestedKey = decodeURIComponent(url.pathname.slice(prefix.length));
			if (requestedKey !== sourceKey) throw new Error('browser requests a different object key');
			keys.push(requestedKey);
		} catch {
			errors.push(
				`Event picture URLs differ from browser-resolvable legacy mappings for event ${event.id}`
			);
		}
	}
	if (errors.length) {
		for (const error of errors) log(`FAIL: ${error}`);
		throw new Error(`Migration verification failed:\n${errors.join('\n')}`);
	}
	log(`DB verification passed (${keys.length} event picture URLs resolved).`);
	return keys;
}
