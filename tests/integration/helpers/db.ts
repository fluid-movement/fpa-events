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
