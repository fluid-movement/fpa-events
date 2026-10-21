import { text } from '#lib/server/validation';
import * as v from 'valibot';
import { redirect } from '@sveltejs/kit';
import { form } from '$app/server';
import { resolve } from '$app/paths';
import { db } from '#lib/server/db';
import { events } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { releasePicture } from '#lib/server/eventForm';
import { requireEventOwner } from '#lib/server/authz';

export const deleteEvent = form(v.object({ eventId: text }), async (data) => {
	const ev = await requireEventOwner(data.eventId);

	await releasePicture(ev.picture, data.eventId);

	await db.delete(events).where(eq(events.id, data.eventId));
	redirect(302, resolve('/events'));
});
