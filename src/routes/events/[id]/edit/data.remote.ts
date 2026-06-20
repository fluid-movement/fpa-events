import * as v from 'valibot';
import { redirect } from '@sveltejs/kit';
import { query, form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { events, eventLocations } from '$lib/server/db/schema';
import { resolve } from '$app/paths';
import { and, eq } from 'drizzle-orm';
import { deleteImage } from '$lib/server/r2';

const updateEventSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	description: v.string(),
	startDate: v.string(),
	endDate: v.string(),
	location: v.string(),
	city: v.optional(v.string()),
	country: v.optional(v.string()),
	latitude: v.optional(v.string()),
	longitude: v.optional(v.string()),
	picture: v.optional(v.string()),
	pictureWidth: v.optional(v.string()),
	pictureHeight: v.optional(v.string())
});

async function findOrCreateEventLocation(
	city: string,
	country: string,
	latitude: number,
	longitude: number
): Promise<number> {
	const [existing] = await db
		.select()
		.from(eventLocations)
		.where(and(eq(eventLocations.city, city), eq(eventLocations.country, country)))
		.limit(1);
	if (existing) return existing.id;
	const [created] = await db
		.insert(eventLocations)
		.values({ city, country, latitude, longitude })
		.returning();
	return created.id;
}

export const getEvent = query(v.string(), async (id) => {
	const [event] = await db
		.select({
			id: events.id,
			name: events.name,
			description: events.description,
			startDate: events.startDate,
			endDate: events.endDate,
			location: events.location,
			eventLocationId: events.eventLocationId,
			city: eventLocations.city,
			country: eventLocations.country,
			picture: events.picture,
			pictureWidth: events.pictureWidth,
			pictureHeight: events.pictureHeight
		})
		.from(events)
		.leftJoin(eventLocations, eq(events.eventLocationId, eventLocations.id))
		.where(eq(events.id, id))
		.limit(1);

	if (!event) throw new Error('Event not found');

	return {
		id: event.id,
		name: event.name,
		description: event.description || '',
		startDate: event.startDate.toISOString().slice(0, 10),
		endDate: event.endDate.toISOString().slice(0, 10),
		location: event.location || '',
		city: event.city ?? null,
		country: event.country ?? null,
		picture: event.picture ?? null,
		pictureWidth: event.pictureWidth ?? null,
		pictureHeight: event.pictureHeight ?? null
	};
});

export const updateEvent = form(updateEventSchema, async (data) => {
	const event = getRequestEvent();

	if (!event.locals.user?.id) {
		throw new Error('Unauthorized: You must be logged in to create an event');
	}

	const eventId = event.params.id;
	if (!eventId) throw new Error('Event ID is required');

	const [existingEvent] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
	if (!existingEvent) throw new Error('Event not found');

	const isOwner = existingEvent.userId === event.locals.user?.id;
	const isAdmin = event.locals.role === 'admin';
	if (!isOwner && !isAdmin) throw new Error('Unauthorized: You can only edit your own events');

	const newPicture = data.picture || null;
	if (existingEvent.picture && newPicture && newPicture !== existingEvent.picture) {
		await deleteImage(existingEvent.picture).catch(() => {});
	}

	let eventLocationId: number | null = existingEvent.eventLocationId ?? null;
	if (data.city && data.country && data.latitude && data.longitude) {
		eventLocationId = await findOrCreateEventLocation(
			data.city,
			data.country,
			parseFloat(data.latitude),
			parseFloat(data.longitude)
		);
	}

	await db
		.update(events)
		.set({
			name: data.name,
			description: data.description,
			startDate: new Date(data.startDate),
			endDate: new Date(data.endDate),
			location: data.location,
			eventLocationId,
			picture: newPicture ?? existingEvent.picture,
			pictureWidth: data.pictureWidth ? parseInt(data.pictureWidth) : existingEvent.pictureWidth,
			pictureHeight: data.pictureHeight
				? parseInt(data.pictureHeight)
				: existingEvent.pictureHeight,
			updatedAt: new Date()
		})
		.where(eq(events.id, eventId));

	await getEvent(eventId).refresh();
	redirect(303, resolve(`/events/${eventId}`));
});
