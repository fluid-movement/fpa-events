import * as v from 'valibot';
import { redirect } from '@sveltejs/kit';
import { form, getRequestEvent } from '$app/server';
import { resolve } from '$app/paths';
import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { deleteImage } from '$lib/server/r2';

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

export const deleteEvent = form(v.object({ eventId: v.string() }), async (data) => {
	const ev = await assertAccess(data.eventId);

	if (ev.picture) {
		await deleteImage(ev.picture).catch(() => {});
	}

	await db.delete(events).where(eq(events.id, data.eventId));
	redirect(302, resolve('/events'));
});
