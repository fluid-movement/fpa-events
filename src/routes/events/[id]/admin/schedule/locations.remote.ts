import { databaseId, optionalCoordinate, storedId, text } from '#lib/server/validation';
import * as v from 'valibot';
import { form, query } from '$app/server';
import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { scheduleLocations } from '#lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireEventManager } from '#lib/server/authz';

/** Coordinates are optional — a venue can be a plain name. */
const locationSchema = v.object({
	name: v.pipe(text, v.minLength(1)),
	address: v.optional(text),
	latitude: optionalCoordinate(90),
	longitude: optionalCoordinate(180)
});

export const listEventLocations = query(storedId, async (eventId) => {
	await requireEventManager(eventId);
	return db.select().from(scheduleLocations).where(eq(scheduleLocations.eventId, eventId));
});

export const createEventLocation = form(
	v.object({ eventId: storedId, ...locationSchema.entries }),
	async (data) => {
		await requireEventManager(data.eventId);
		// Only keep a position when both halves are present.
		const hasCoords = data.latitude !== null && data.longitude !== null;
		const [created] = await db
			.insert(scheduleLocations)
			.values({
				eventId: data.eventId,
				name: data.name,
				address: data.address?.trim() || null,
				latitude: hasCoords ? data.latitude : null,
				longitude: hasCoords ? data.longitude : null
			})
			.returning();
		await listEventLocations(data.eventId).refresh();
		return created;
	}
);

export const deleteEventLocation = form(
	v.object({ id: v.pipe(databaseId, v.transform(Number)), eventId: storedId }),
	async (data) => {
		await requireEventManager(data.eventId);
		// Scoped to the authorised event: the venue id comes from the form.
		const deleted = await db
			.delete(scheduleLocations)
			.where(and(eq(scheduleLocations.id, data.id), eq(scheduleLocations.eventId, data.eventId)))
			.returning({ id: scheduleLocations.id });
		if (deleted.length === 0) error(404, 'Venue not found');
		await listEventLocations(data.eventId).refresh();
	}
);
