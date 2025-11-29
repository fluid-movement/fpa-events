import * as v from 'valibot';
import { redirect } from '@sveltejs/kit';
import { form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { resolve } from '$app/paths';
import { ulid } from 'ulid';

const createEventSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	description: v.string(),
	startDate: v.string(),
	endDate: v.string(),
	location: v.string()
});

export const createEvent = form(createEventSchema, async (data) => {
  const event = getRequestEvent()
  if (!event.locals.user?.id) {
    throw new Error('Unauthorized: You must be logged in to create an event');
  }
  
  const userId = event.locals.user.id;
	const eventId = ulid().toLowerCase();

	const insertData: typeof events.$inferInsert = {
		id: eventId,
		userId: userId,
		name: data.name,
		description: data.description,
		startDate: new Date(data.startDate),
		endDate: new Date(data.endDate),
		location: data.location,
		createdAt: new Date()
	};

	const success = await db.insert(events).values(insertData);

	if (!success) {
	    throw new Error('Failed to create event');
    }
    
	redirect(303, resolve(`/events/${eventId}`));
});
