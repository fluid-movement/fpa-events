import * as v from 'valibot';
import { form, query } from '$app/server';
import { db } from '$lib/server/db';
import { scheduleLocations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireEventManager } from '$lib/server/authz';

const locationSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1)),
	address: v.optional(v.string()),
	latitude: v.pipe(v.string(), v.transform(Number)),
	longitude: v.pipe(v.string(), v.transform(Number))
});

export const listEventLocations = query(v.string(), async (eventId) => {
	await requireEventManager(eventId);
	return db.select().from(scheduleLocations).where(eq(scheduleLocations.eventId, eventId));
});

export const createEventLocation = form(
	v.object({ eventId: v.string(), ...locationSchema.entries }),
	async (data) => {
		await requireEventManager(data.eventId);
		const [created] = await db
			.insert(scheduleLocations)
			.values({
				eventId: data.eventId,
				name: data.name,
				address: data.address ?? null,
				latitude: data.latitude,
				longitude: data.longitude
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
