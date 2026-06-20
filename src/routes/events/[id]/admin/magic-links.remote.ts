import * as v from 'valibot';
import { form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { events, eventMagicLinks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';

async function assertAccess(eventId: string) {
	const event = getRequestEvent();
	if (!event.locals.user) throw new Error('Unauthorized');
	const [ev] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
	if (!ev) throw new Error('Event not found');
	if (ev.userId !== event.locals.user.id && event.locals.role !== 'admin') {
		throw new Error('Forbidden');
	}
	return ev;
}

const schema = v.object({ eventId: v.string() });

export const generateLink = form(schema, async (data) => {
	await assertAccess(data.eventId);
	const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
	await db.insert(eventMagicLinks).values({
		id: ulid().toLowerCase(),
		eventId: data.eventId,
		expiresAt
	});
});

export const regenerateLink = form(schema, async (data) => {
	await assertAccess(data.eventId);
	await db.delete(eventMagicLinks).where(eq(eventMagicLinks.eventId, data.eventId));
	const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
	await db.insert(eventMagicLinks).values({
		id: ulid().toLowerCase(),
		eventId: data.eventId,
		expiresAt
	});
});
