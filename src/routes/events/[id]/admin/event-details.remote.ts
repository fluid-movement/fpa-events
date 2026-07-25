import * as v from 'valibot';
import { redirect } from '@sveltejs/kit';
import { query, form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { events, eventLocations } from '$lib/server/db/schema';
import { resolve } from '$app/paths';
import { eq } from 'drizzle-orm';
import { findOrCreateEventLocation } from '$lib/server/db/eventLocations';
import { deleteImage } from '$lib/server/r2';
import { requireEventManager } from '$lib/server/authz';
import { verifyTurnstile } from '$lib/server/turnstile';
import { sanitizeRichText } from '$lib/utils/html';

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
	pictureHeight: v.optional(v.string()),
	turnstileToken: v.optional(v.string())
});

export const getEvent = query(v.string(), async (id) => {
	await requireEventManager(id);

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
		// Sanitized here because the manage area renders it as HTML: a co-organizer
		// could otherwise store markup that executes for the owner.
		description: event.description ? sanitizeRichText(event.description) : '',
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

	const eventId = event.params.id;
	if (!eventId) throw new Error('Event ID is required');

	const existingEvent = await requireEventManager(eventId);

	if (!(await verifyTurnstile(data.turnstileToken))) {
		throw new Error('Captcha verification failed');
	}

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
	// Back to the read-only record, which is the manage area's index route.
	redirect(303, resolve(`/events/${eventId}/admin`));
});
