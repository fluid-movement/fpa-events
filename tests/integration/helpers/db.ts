import postgres from 'postgres';
import { ulid } from 'ulid';
import { config } from 'dotenv';

config(); // load .env

let _sql: ReturnType<typeof postgres> | null = null;

function sql() {
	if (!_sql) {
		const url = process.env.DATABASE_URL;
		if (!url) throw new Error('DATABASE_URL not set');
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

export async function createTestUser(
	email: string,
	name: string = 'Test User'
): Promise<string> {
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

export async function setAttending(eventId: string, userId: string): Promise<void> {
	await sql()`
		INSERT INTO event_user (event_id, user_id, status, created_at, updated_at)
		VALUES (${eventId}, ${userId}, 'attending', now(), now())
		ON CONFLICT DO NOTHING
	`;
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

export async function setUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
	await sql()`UPDATE "user" SET role = ${role} WHERE id = ${userId}`;
}

export async function closeDb(): Promise<void> {
	if (_sql) {
		await _sql.end();
		_sql = null;
	}
}
