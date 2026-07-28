import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function ensureCalendarToken(userId: string): Promise<string> {
	const [row] = await db
		.select({ calendarToken: user.calendarToken })
		.from(user)
		.where(eq(user.id, userId));

	if (row?.calendarToken) return row.calendarToken;

	const token = crypto.randomUUID();
	await db.update(user).set({ calendarToken: token }).where(eq(user.id, userId));
	return token;
}

export async function regenerateCalendarToken(userId: string): Promise<string> {
	const token = crypto.randomUUID();
	await db.update(user).set({ calendarToken: token }).where(eq(user.id, userId));
	return token;
}
