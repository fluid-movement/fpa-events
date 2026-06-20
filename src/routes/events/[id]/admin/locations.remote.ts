import * as v from 'valibot';
import { form, query, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { events, scheduleLocations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const locationSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1)),
	address: v.optional(v.string()),
	latitude: v.pipe(v.string(), v.transform(Number)),
	longitude: v.pipe(v.string(), v.transform(Number))
});

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

export const listEventLocations = query(v.string(), async (eventId) => {
	await assertAccess(eventId);
	return db.select().from(scheduleLocations).where(eq(scheduleLocations.eventId, eventId));
});

export const createEventLocation = form(
	v.object({ eventId: v.string(), ...locationSchema.entries }),
	async (data) => {
		await assertAccess(data.eventId);
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
		await assertAccess(data.eventId);
		await db.delete(scheduleLocations).where(eq(scheduleLocations.id, data.id));
		await listEventLocations(data.eventId).refresh();
	}
);
