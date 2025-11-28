import * as v from 'valibot';
import { redirect } from '@sveltejs/kit';
import { form } from '$app/server';
import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { resolve } from '$app/paths';

const createEventSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	description: v.string(),
	startDate: v.string(),
	endDate: v.string(),
	location: v.string()
});

export const createEvent = form(createEventSchema, async (data) => {
	const userId = '123';
	const eventId = crypto.randomUUID();
	const now = new Date();

	const insertData: typeof events.$inferInsert = {
		id: eventId,
		userId: userId,
		name: data.name,
		description: data.description,
		startDate: new Date(data.startDate),
		endDate: new Date(data.endDate),
		location: data.location,
		createdAt: now,
		updatedAt: now
	};
	
	console.log(insertData)

	await db.insert(events).values(insertData);

	redirect(303, resolve(`/events/${eventId}`));
});
