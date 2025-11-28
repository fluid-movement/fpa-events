import { query } from '$app/server';
import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';

export const getAllEvents = query(async () => {
	return await db.select().from(events);
});

