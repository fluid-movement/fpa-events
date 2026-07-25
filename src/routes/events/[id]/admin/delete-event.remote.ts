import * as v from 'valibot';
import { redirect } from '@sveltejs/kit';
import { form } from '$app/server';
import { resolve } from '$app/paths';
import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { deleteImage } from '$lib/server/r2';
import { requireEventOwner } from '$lib/server/authz';

export const deleteEvent = form(v.object({ eventId: v.string() }), async (data) => {
	const ev = await requireEventOwner(data.eventId);

	if (ev.picture) {
		await deleteImage(ev.picture).catch(() => {});
	}

	await db.delete(events).where(eq(events.id, data.eventId));
	redirect(302, resolve('/events'));
});
