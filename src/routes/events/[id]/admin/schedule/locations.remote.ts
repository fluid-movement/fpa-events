import * as v from 'valibot';
import { form, query } from '$app/server';
import { db } from '$lib/server/db';
import { scheduleLocations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireEventManager } from '$lib/server/authz';

/**
 * Coordinates are optional — a venue can be a plain name.
 *
 * Parsed explicitly rather than with `v.transform(Number)`: `Number('')` is `0`,
 * so an empty field would otherwise persist a position in the Gulf of Guinea
 * instead of "no position".
 */
const optionalCoordinate = v.pipe(
	v.optional(v.string()),
	v.transform((s) => {
		if (s === undefined || s.trim() === '') return null;
		const n = Number(s);
		return Number.isFinite(n) ? n : null;
	})
);

const locationSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1)),
	address: v.optional(v.string()),
	latitude: optionalCoordinate,
	longitude: optionalCoordinate
});

export const listEventLocations = query(v.string(), async (eventId) => {
	await requireEventManager(eventId);
	return db.select().from(scheduleLocations).where(eq(scheduleLocations.eventId, eventId));
});

export const createEventLocation = form(
	v.object({ eventId: v.string(), ...locationSchema.entries }),
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
	v.object({ id: v.pipe(v.string(), v.transform(Number)), eventId: v.string() }),
	async (data) => {
		await requireEventManager(data.eventId);
		await db.delete(scheduleLocations).where(eq(scheduleLocations.id, data.id));
		await listEventLocations(data.eventId).refresh();
	}
);
