import postgres from 'postgres';
import { ulid } from 'ulid';

// No dotenv call here on purpose. playwright.config.ts loads .env.test /
// .env.test.local before any spec is imported. This file used to call a bare
// `config()`, which loaded .env and pointed the whole suite at the *dev*
// database — the helpers below insert and delete rows, so that was live data.

let _sql: ReturnType<typeof postgres> | null = null;

/**
 * Guard against ever running the destructive helpers below against a database
 * that is not the throwaway test one. Cheap insurance: every helper here goes
 * through `sql()`, so one check covers the whole file.
 */
function assertTestDatabase(url: string): void {
	const name = new URL(url).pathname.replace(/^\//, '');
	if (!/test/i.test(name)) {
		throw new Error(
			`Refusing to run integration tests against database "${name}" — the name must ` +
				`contain "test". These helpers insert and delete rows directly.\n` +
				`Check DATABASE_URL in .env.test (or .env.test.local).`
		);
	}
}

export function sql() {
	if (!_sql) {
		const url = process.env.DATABASE_URL;
		if (!url) {
			throw new Error('DATABASE_URL not set — is playwright.config.ts loading .env.test?');
		}
		assertTestDatabase(url);
		_sql = postgres(url);
	}
	return _sql;
}

export async function getTestUserId(email: string): Promise<string> {
	const [row] = await sql()<[{ id: string }]>`
		SELECT id FROM "user" WHERE email = ${email} LIMIT 1
	`;
	if (!row) throw new Error(`Test user not found: ${email}`);
	return row.id;
}

export async function createTestUser(email: string, name: string = 'Test User'): Promise<string> {
	const id = ulid().toLowerCase();
	await sql()`
		INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
		VALUES (${id}, ${name}, ${email}, false, 'user', now(), now())
		ON CONFLICT (email) DO NOTHING
	`;
	const [row] = await sql()<[{ id: string }]>`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`;
	return row.id;
}

export async function deleteTestUser(id: string): Promise<void> {
	await sql()`DELETE FROM "user" WHERE id = ${id}`;
}

/** Null until the user has loaded /attending or /dashboard, which mint it. */
export async function getCalendarToken(userId: string): Promise<string | null> {
	const rows = await sql()<[{ calendar_token: string | null }]>`
		SELECT calendar_token FROM "user" WHERE id = ${userId} LIMIT 1
	`;
	return rows[0]?.calendar_token ?? null;
}

export async function getUserName(email: string): Promise<string | null> {
	const rows = await sql()<[{ name: string }]>`
		SELECT name FROM "user" WHERE email = ${email} LIMIT 1
	`;
	return rows[0]?.name ?? null;
}

export async function getUserImage(email: string): Promise<string | null> {
	const rows = await sql()<[{ image: string | null }]>`
		SELECT image FROM "user" WHERE email = ${email} LIMIT 1
	`;
	return rows[0]?.image ?? null;
}

export async function userExists(email: string): Promise<boolean> {
	const rows = await sql()`SELECT 1 FROM "user" WHERE email = ${email} LIMIT 1`;
	return rows.length > 0;
}

export async function deleteUserByEmail(email: string): Promise<void> {
	await sql()`DELETE FROM "user" WHERE email = ${email}`;
}

export async function getSessionIds(email: string): Promise<string[]> {
	const rows = await sql()<{ id: string }[]>`
		SELECT s.id FROM session s JOIN "user" u ON u.id = s.user_id
		WHERE u.email = ${email} ORDER BY s.id
	`;
	return rows.map((row) => row.id);
}

export async function createTestEvent(
	userId: string,
	overrides: { name?: string; startDate?: Date; endDate?: Date } = {}
): Promise<string> {
	const id = ulid().toLowerCase();
	const name = overrides.name ?? 'Playwright Test Event';
	const startDate = overrides.startDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
	const endDate = overrides.endDate ?? new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

	await sql()`
		INSERT INTO events (id, user_id, name, location, description, start_date, end_date, created_at, updated_at)
		VALUES (${id}, ${userId}, ${name}, 'Test Location', '', ${startDate}, ${endDate}, now(), now())
	`;
	return id;
}

export async function deleteTestEvent(id: string): Promise<void> {
	await sql()`DELETE FROM events WHERE id = ${id}`;
}

/** For events created through the UI, whose id the test never chose. */
export async function getEventIdByName(name: string): Promise<string | null> {
	const rows = await sql()<[{ id: string }]>`
		SELECT id FROM events WHERE name = ${name} LIMIT 1
	`;
	return rows[0]?.id ?? null;
}

/** Cleanup for UI-created events — safe to call when nothing was created. */
export async function deleteEventsByName(name: string): Promise<void> {
	await sql()`DELETE FROM events WHERE name = ${name}`;
}

export async function getEventDescription(eventId: string): Promise<string | null> {
	const rows = await sql()<[{ description: string }]>`
		SELECT description FROM events WHERE id = ${eventId} LIMIT 1
	`;
	return rows[0]?.description ?? null;
}

/** The shared city row an event points at, or null when it has none. */
export async function getEventLocation(
	eventId: string
): Promise<{ id: number; latitude: number; longitude: number } | null> {
	const rows = await sql()<[{ id: number; latitude: number; longitude: number }]>`
		SELECT l.id, l.latitude, l.longitude FROM events e
		JOIN event_locations l ON l.id = e.event_location_id
		WHERE e.id = ${eventId} LIMIT 1
	`;
	return rows[0] ?? null;
}

export async function countEventLocations(country: string): Promise<number> {
	const rows = await sql()<[{ n: number }]>`
		SELECT count(*)::int AS n FROM event_locations WHERE country = ${country}
	`;
	return rows[0].n;
}

/** Inserts straight into the table, so a test can plant rows the app would now refuse. */
export async function insertEventLocation(
	city: string,
	country: string,
	latitude: number | 'NaN',
	longitude: number | 'NaN'
): Promise<number> {
	const rows = await sql()<[{ id: number }]>`
		INSERT INTO event_locations (city, country, latitude, longitude)
		VALUES (${city}, ${country}, ${String(latitude)}::real, ${String(longitude)}::real)
		RETURNING id
	`;
	return rows[0].id;
}

export async function pointEventAtLocation(eventId: string, locationId: number): Promise<void> {
	await sql()`UPDATE events SET event_location_id = ${locationId} WHERE id = ${eventId}`;
}

/** Removes a spec's location rows; the events' FK is ON DELETE SET NULL. */
export async function deleteEventLocations(country: string): Promise<void> {
	await sql()`DELETE FROM event_locations WHERE country = ${country}`;
}

export async function setAttending(eventId: string, userId: string): Promise<void> {
	await sql()`
		INSERT INTO event_user (event_id, user_id, status, created_at, updated_at)
		VALUES (${eventId}, ${userId}, 'attending', now(), now())
		ON CONFLICT DO NOTHING
	`;
}

/** Seed an accepted co-organizer seat, as `/invite/[token]` would create. */
export async function setOrganizing(eventId: string, userId: string): Promise<void> {
	await sql()`
		INSERT INTO event_user (event_id, user_id, status, created_at, updated_at)
		VALUES (${eventId}, ${userId}, 'organizing', now(), now())
		ON CONFLICT DO NOTHING
	`;
}

export async function getEventName(eventId: string): Promise<string | null> {
	const rows = await sql()<[{ name: string }]>`
		SELECT name FROM events WHERE id = ${eventId} LIMIT 1
	`;
	return rows[0]?.name ?? null;
}

export async function clearAttending(eventId: string, userId: string): Promise<void> {
	await sql()`
		DELETE FROM event_user
		WHERE event_id = ${eventId} AND user_id = ${userId} AND status = 'attending'
	`;
}

export async function isAttending(eventId: string, userId: string): Promise<boolean> {
	const rows = await sql()`
		SELECT id FROM event_user
		WHERE event_id = ${eventId} AND user_id = ${userId} AND status = 'attending'
	`;
	return rows.length > 0;
}

export async function getScheduleCount(eventId: string): Promise<number> {
	const rows = await sql()`SELECT id FROM schedules WHERE event_id = ${eventId}`;
	return rows.length;
}

/**
 * Insert a schedule item straight into the table, bypassing the remote
 * function — stands in for rows stored before write-side checks existed.
 */
export async function insertScheduleItem(
	eventId: string,
	name: string,
	description: string
): Promise<string> {
	const id = ulid().toLowerCase();
	const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
	const end = new Date(start.getTime() + 60 * 60 * 1000);
	await sql()`
		INSERT INTO schedules (id, event_id, name, start_date, end_date, description, created_at, updated_at)
		VALUES (${id}, ${eventId}, ${name}, ${start}, ${end}, ${description}, now(), now())
	`;
	return id;
}

export async function getScheduleItem(
	id: string
): Promise<{ eventId: string; name: string; locationId: number | null } | null> {
	const [row] = await sql()<{ event_id: string; name: string; location_id: number | null }[]>`
		SELECT event_id, name, location_id FROM schedules WHERE id = ${id}
	`;
	return row ? { eventId: row.event_id, name: row.name, locationId: row.location_id } : null;
}

export async function insertVenue(eventId: string, name: string): Promise<number> {
	const [row] = await sql()<{ id: number }[]>`
		INSERT INTO schedule_locations (event_id, name) VALUES (${eventId}, ${name}) RETURNING id
	`;
	return row.id;
}

export async function venueExists(id: number): Promise<boolean> {
	const rows = await sql()`SELECT id FROM schedule_locations WHERE id = ${id}`;
	return rows.length > 0;
}

export async function getScheduleDescriptions(eventId: string): Promise<(string | null)[]> {
	const rows = await sql()<{ description: string | null }[]>`
		SELECT description FROM schedules WHERE event_id = ${eventId}
	`;
	return rows.map((r) => r.description);
}

export async function setEventPicture(eventId: string, url: string | null): Promise<void> {
	await sql()`UPDATE events SET picture = ${url} WHERE id = ${eventId}`;
}

export async function getEventPicture(eventId: string): Promise<string | null> {
	const [row] = await sql()<
		{ picture: string | null }[]
	>`SELECT picture FROM events WHERE id = ${eventId}`;
	return row?.picture ?? null;
}

/** Every relationship row the user has to the event — at most one is valid. */
export async function getEventUserRows(eventId: string, userId: string): Promise<string[]> {
	const rows = await sql()<{ status: string }[]>`
		SELECT status FROM event_user WHERE event_id = ${eventId} AND user_id = ${userId}
	`;
	return rows.map((r) => r.status);
}

export async function getEventDates(
	eventId: string
): Promise<{ startDate: Date; endDate: Date } | null> {
	const [row] = await sql()<{ start_date: Date; end_date: Date }[]>`
		SELECT start_date, end_date FROM events WHERE id = ${eventId}
	`;
	return row ? { startDate: row.start_date, endDate: row.end_date } : null;
}

export async function eventExists(eventId: string): Promise<boolean> {
	const rows = await sql()`SELECT id FROM events WHERE id = ${eventId}`;
	return rows.length > 0;
}

export async function setUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
	await sql()`UPDATE "user" SET role = ${role} WHERE id = ${userId}`;
}

export async function setShowAttendance(userId: string, show: boolean): Promise<void> {
	await sql()`UPDATE "user" SET show_attendance = ${show} WHERE id = ${userId}`;
}

export async function getShowAttendance(userId: string): Promise<boolean> {
	const rows = await sql()<[{ show_attendance: boolean }]>`
		SELECT show_attendance FROM "user" WHERE id = ${userId} LIMIT 1
	`;
	return rows[0]?.show_attendance ?? true;
}

export async function getLocationCoords(
	eventId: string,
	name: string
): Promise<{ latitude: number | null; longitude: number | null } | null> {
	const rows = await sql()<[{ latitude: number | null; longitude: number | null }]>`
		SELECT latitude, longitude FROM schedule_locations
		WHERE event_id = ${eventId} AND name = ${name} LIMIT 1
	`;
	return rows[0] ?? null;
}

export async function createMagicLink(
	eventId: string,
	expiresAt: Date = new Date(Date.now() + 24 * 60 * 60 * 1000)
): Promise<string> {
	const id = ulid().toLowerCase();
	await sql()`
		INSERT INTO event_magic_links (id, event_id, expires_at, created_at, updated_at)
		VALUES (${id}, ${eventId}, ${expiresAt}, now(), now())
	`;
	return id;
}

export async function getEventUserStatus(eventId: string, userId: string): Promise<string | null> {
	const rows = await sql()<[{ status: string }]>`
		SELECT status FROM event_user
		WHERE event_id = ${eventId} AND user_id = ${userId}
		LIMIT 1
	`;
	return rows[0]?.status ?? null;
}

export async function clearEventUser(eventId: string, userId: string): Promise<void> {
	await sql()`DELETE FROM event_user WHERE event_id = ${eventId} AND user_id = ${userId}`;
}

export async function closeDb(): Promise<void> {
	if (_sql) {
		await _sql.end();
		_sql = null;
	}
}
