import * as v from 'valibot';
import { redirect } from '@sveltejs/kit';
import { query, form, getRequestEvent } from '$app/server';
import { resolve } from '$app/paths';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { events, eventLocations } from '$lib/server/db/schema';
import { eventFormSchema, parsePictureFields, resolveEventLocationId } from '$lib/server/eventForm';
import { deleteImage } from '$lib/server/r2';
import { requireEventManager } from '$lib/server/authz';
import { requireTurnstile } from '$lib/server/turnstile';
import { sanitizeRichText } from '$lib/utils/html';

/** The event as the manage area edits it: dates as `yyyy-mm-dd`, never null. */
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
		...event,
		// Sanitized here because the manage area renders it as HTML: a co-organizer
		// could otherwise store markup that executes for the owner.
		description: event.description ? sanitizeRichText(event.description) : '',
		startDate: event.startDate.toISOString().slice(0, 10),
		endDate: event.endDate.toISOString().slice(0, 10),
		location: event.location || ''
	};
});

export const updateEvent = form(eventFormSchema, async (data) => {
	const eventId = getRequestEvent().params.id;
	if (!eventId) throw new Error('Event ID is required');

	const existing = await requireEventManager(eventId);
	await requireTurnstile(data.turnstileToken);

	const picture = parsePictureFields(data, existing);
	// Drop the replaced image from the bucket, but never let that failure block
	// the save — an orphaned object is cheaper than a lost edit.
	if (existing.picture && picture.picture !== existing.picture) {
		await deleteImage(existing.picture).catch(() => {});
	}

	await db
		.update(events)
		.set({
			name: data.name,
			description: data.description,
			startDate: new Date(data.startDate),
			endDate: new Date(data.endDate),
			location: data.location,
			eventLocationId: await resolveEventLocationId(data, existing.eventLocationId),
			...picture,
			updatedAt: new Date()
		})
		.where(eq(events.id, eventId));

	await getEvent(eventId).refresh();
	// Back to the read-only record, which is the manage area's index route.
	redirect(303, resolve(`/events/${eventId}/admin`));
});
