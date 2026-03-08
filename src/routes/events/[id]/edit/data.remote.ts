import * as v from 'valibot';
import { redirect } from '@sveltejs/kit';
import { query, form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { resolve } from '$app/paths';
import { eq } from 'drizzle-orm';

const updateEventSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	description: v.string(),
	startDate: v.string(),
	endDate: v.string(),
	location: v.string()
});

// Query to fetch the current event data
export const getEvent = query(v.string(), async (id) => {
	const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);

	if (!event) {
		throw new Error('Event not found');
	}

	return {
		id: event.id,
		name: event.name,
		description: event.description || '',
		startDate: event.startDate.toISOString().slice(0, 10), // Format for date input (YYYY-MM-DD)
		endDate: event.endDate.toISOString().slice(0, 10),
		location: event.location || ''
	};
});

// Form function to update the event
export const updateEvent = form(updateEventSchema, async (data) => {
	const event = getRequestEvent();

	if (!event.locals.user?.id) {
		throw new Error('Unauthorized: You must be logged in to create an event');
	}

	const eventId = event.params.id;

	if (!eventId) {
		throw new Error('Event ID is required');
	}

	// Check if event exists and user has permission to edit
	const [existingEvent] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);

	if (!existingEvent) {
		throw new Error('Event not found');
	}

	if (existingEvent.userId !== event.locals.user?.id) {
		throw new Error('Unauthorized: You can only edit your own events');
	}

	const now = new Date();

	const updateData = {
		name: data.name,
		description: data.description,
		startDate: new Date(data.startDate),
		endDate: new Date(data.endDate),
		location: data.location,
		updatedAt: now
	};

	await db.update(events).set(updateData).where(eq(events.id, eventId));

	// Refresh the query so the form shows updated data
	await getEvent(eventId).refresh();

	redirect(303, resolve(`/events/${eventId}`));
});
