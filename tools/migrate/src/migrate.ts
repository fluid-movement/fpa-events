// Step 2: wipe-and-reload DB migration, legacy → target, in one transaction.
// IDs are ULIDs in both apps and are preserved 1:1, so every run converges to
// the state of the legacy dump. Pass --dry-run to roll back instead of commit.
//
// Timestamps are selected as ::text and inserted via a plain cast so values
// are copied verbatim, without the pg driver round-tripping them through a JS
// Date in the local timezone.
import pg from 'pg';
import { ulid } from 'ulid';
import { legacyPool, targetPool, requireEnv } from './db';
import { Report } from './report';
import { loadLocationMap } from './locations';

// Also honor `npm run migrate --dry-run` (without the `--` separator): npm
// swallows the flag itself but records it as npm_config_dry_run.
const dryRun = process.argv.includes('--dry-run') || process.env.npm_config_dry_run === 'true';

// Reverse FK order: children before parents.
const WIPE_ORDER = [
	'schedules',
	'schedule_locations',
	'event_magic_links',
	'event_user',
	'events',
	'event_locations',
	'session',
	'account',
	'verification',
	'"user"'
];

interface LegacyUser {
	id: string;
	name: string;
	email: string;
	password: string | null;
	role: string;
	created_at: string;
	updated_at: string;
}

interface LegacyEvent {
	id: string;
	user_id: string;
	name: string;
	start_date: string;
	end_date: string;
	location: string;
	description: string;
	picture: string | null;
	picture_width: number | null;
	picture_height: number | null;
	created_at: string;
	updated_at: string;
}

interface LegacyEventUser {
	event_id: string;
	user_id: string;
	status: string;
	created_at: string;
	updated_at: string;
}

interface LegacyMagicLink {
	id: string;
	event_id: string;
	expires_at: string;
	created_at: string;
	updated_at: string;
}

interface LegacySchedule {
	id: string;
	event_id: string;
	name: string;
	start_date: string;
	end_date: string;
	description: string | null;
	location: string | null;
	longitude: number | null;
	latitude: number | null;
	created_at: string;
	updated_at: string;
}

async function migrateUsers(legacy: pg.Pool, target: pg.PoolClient, report: Report): Promise<void> {
	const { rows } = await legacy.query<LegacyUser>(
		`SELECT id, name, email, password, role, created_at::text, updated_at::text
		 FROM users ORDER BY id`
	);

	let accounts = 0;
	for (const u of rows) {
		// All migrated users are marked verified: the legacy app never used
		// email verification (email_verified_at is NULL for everyone), and
		// these are established accounts — don't lock them out at cutover.
		await target.query(
			`INSERT INTO "user" (id, name, email, email_verified, image, role, calendar_token, created_at, updated_at)
			 VALUES ($1, $2, $3, TRUE, NULL, $4, NULL, $5::timestamp, $6::timestamp)`,
			[u.id, u.name, u.email, u.role, u.created_at, u.updated_at]
		);
		if (u.password) {
			await target.query(
				`INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
				 VALUES ($1, $2, 'credential', $2, $3, $4::timestamp, $5::timestamp)`,
				[ulid().toLowerCase(), u.id, u.password, u.created_at, u.updated_at]
			);
			accounts++;
		} else {
			report.warn(
				`User ${u.email} has no password hash — migrated without credentials (must use password reset).`
			);
		}
	}
	report.count('users → user', rows.length, rows.length);
	report.count('users → account', rows.length, accounts);
}

async function migrateEvents(
	legacy: pg.Pool,
	target: pg.PoolClient,
	report: Report
): Promise<void> {
	const publicUrl = requireEnv('TARGET_R2_PUBLIC_URL', 'R2_PUBLIC_URL').replace(/\/$/, '');
	const locationMap = loadLocationMap();
	const { rows } = await legacy.query<LegacyEvent>(
		`SELECT id, user_id, name, start_date::text, end_date::text, location, description,
		        picture, picture_width, picture_height, created_at::text, updated_at::text
		 FROM events ORDER BY id`
	);

	// Insert only the map locations actually referenced, deduped on (city, country).
	const locationIds = new Map<string, number>(); // "city|country" → event_locations.id
	const unmapped = new Set<string>();
	const unresolved = new Set<string>();

	async function eventLocationId(location: string): Promise<number | null> {
		if (!(location in locationMap)) {
			unmapped.add(location);
			return null;
		}
		const mapped = locationMap[location];
		if (!mapped) {
			unresolved.add(location);
			return null;
		}
		const key = `${mapped.city}|${mapped.country}`;
		let id = locationIds.get(key);
		if (id === undefined) {
			const { rows } = await target.query<{ id: number }>(
				`INSERT INTO event_locations (city, country, latitude, longitude)
				 VALUES ($1, $2, $3, $4) RETURNING id`,
				[mapped.city, mapped.country, mapped.latitude, mapped.longitude]
			);
			id = rows[0].id;
			locationIds.set(key, id);
		}
		return id;
	}

	for (const e of rows) {
		const picture = e.picture ? `${publicUrl}/${e.picture}` : null;
		await target.query(
			`INSERT INTO events (id, user_id, name, start_date, end_date, location, event_location_id,
			                     description, picture, picture_width, picture_height, created_at, updated_at)
			 VALUES ($1, $2, $3, $4::timestamp, $5::timestamp, $6, $7, $8, $9, $10, $11, $12::timestamp, $13::timestamp)`,
			[
				e.id,
				e.user_id,
				e.name,
				e.start_date,
				e.end_date,
				e.location,
				await eventLocationId(e.location),
				e.description,
				picture,
				e.picture_width,
				e.picture_height,
				e.created_at,
				e.updated_at
			]
		);
	}

	report.count('events', rows.length, rows.length);
	report.count('event_locations', locationIds.size, locationIds.size);
	for (const loc of unmapped) {
		report.warn(
			`Event location "${loc}" is missing from data/event-locations.json — run \`npm run geocode\`. Migrated without map location.`
		);
	}
	for (const loc of unresolved) {
		report.warn(
			`Event location "${loc}" is null in the mapping file — migrated without map location.`
		);
	}
}

async function migrateEventUsers(
	legacy: pg.Pool,
	target: pg.PoolClient,
	report: Report
): Promise<void> {
	const { rows } = await legacy.query<LegacyEventUser>(
		`SELECT event_id, user_id, status, created_at::text, updated_at::text FROM event_user ORDER BY id`
	);
	for (const r of rows) {
		await target.query(
			`INSERT INTO event_user (event_id, user_id, status, created_at, updated_at)
			 VALUES ($1, $2, $3, $4::timestamp, $5::timestamp)`,
			[r.event_id, r.user_id, r.status, r.created_at, r.updated_at]
		);
	}
	report.count('event_user', rows.length, rows.length);
}

async function migrateMagicLinks(
	legacy: pg.Pool,
	target: pg.PoolClient,
	report: Report
): Promise<void> {
	const { rows } = await legacy.query<LegacyMagicLink>(
		`SELECT id, event_id, expires_at::text, created_at::text, updated_at::text FROM event_magic_links ORDER BY id`
	);
	for (const r of rows) {
		await target.query(
			`INSERT INTO event_magic_links (id, event_id, expires_at, created_at, updated_at)
			 VALUES ($1, $2, $3::timestamp, $4::timestamp, $5::timestamp)`,
			[r.id, r.event_id, r.expires_at, r.created_at, r.updated_at]
		);
	}
	report.count('event_magic_links', rows.length, rows.length);
}

async function migrateSchedules(
	legacy: pg.Pool,
	target: pg.PoolClient,
	report: Report
): Promise<void> {
	const { rows } = await legacy.query<LegacySchedule>(
		`SELECT id, event_id, name, start_date::text, end_date::text, description, location,
		        longitude, latitude, created_at::text, updated_at::text
		 FROM schedules ORDER BY id`
	);

	// Venue rows deduped per event on (name, lat, lng), mirroring how the app
	// reuses schedule_locations across a single event's schedule items.
	const venueIds = new Map<string, number>();
	let venues = 0;
	let nameOnly = 0;

	for (const s of rows) {
		const locationText = s.location?.trim() || null;
		const hasCoords = s.latitude !== null && s.longitude !== null;
		let locationId: number | null = null;
		const description = s.description;

		if (locationText) {
			// schedule_locations.latitude/longitude are nullable, so a legacy row with
			// only a location name still becomes a first-class venue rather than being
			// flattened into the description.
			const name = locationText;
			const key = hasCoords
				? `${s.event_id}|${name}|${s.latitude}|${s.longitude}`
				: `${s.event_id}|${name}`;
			let id = venueIds.get(key);
			if (id === undefined) {
				const { rows: inserted } = await target.query<{ id: number }>(
					`INSERT INTO schedule_locations (event_id, name, address, latitude, longitude, created_at)
					 VALUES ($1, $2, $3, $4, $5, $6::timestamp) RETURNING id`,
					[
						s.event_id,
						name,
						hasCoords ? locationText : null,
						hasCoords ? s.latitude : null,
						hasCoords ? s.longitude : null,
						s.created_at
					]
				);
				id = inserted[0].id;
				venueIds.set(key, id);
				venues++;
				if (!hasCoords) nameOnly++;
			}
			locationId = id;
		}

		await target.query(
			`INSERT INTO schedules (id, event_id, name, start_date, end_date, description, location_id, created_at, updated_at)
			 VALUES ($1, $2, $3, $4::timestamp, $5::timestamp, $6, $7, $8::timestamp, $9::timestamp)`,
			[
				s.id,
				s.event_id,
				s.name,
				s.start_date,
				s.end_date,
				description,
				locationId,
				s.created_at,
				s.updated_at
			]
		);
	}

	report.count('schedules', rows.length, rows.length);
	report.count('schedule_locations', venues, venues);
	if (nameOnly > 0) {
		report.note(
			`${nameOnly} venue(s) had no coordinates — migrated as name-only locations.`
		);
	}
}

async function main() {
	const legacy = legacyPool();
	const target = targetPool();
	const client = await target.connect();
	const report = new Report();

	console.log(`Migrating legacy → target${dryRun ? ' (dry run, will roll back)' : ''}…`);
	try {
		await client.query('BEGIN');
		for (const table of WIPE_ORDER) {
			await client.query(`DELETE FROM ${table}`);
		}
		await migrateUsers(legacy, client, report);
		await migrateEvents(legacy, client, report);
		await migrateEventUsers(legacy, client, report);
		await migrateMagicLinks(legacy, client, report);
		await migrateSchedules(legacy, client, report);
		await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
		console.log(dryRun ? 'Dry run complete — all changes rolled back.' : 'Committed.');
	} catch (err) {
		await client.query('ROLLBACK').catch(() => {});
		throw err;
	} finally {
		client.release();
		await Promise.all([legacy.end(), target.end()]);
	}

	report.print();
	if (!dryRun) console.log('\nNext: npm run migrate:pictures');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
