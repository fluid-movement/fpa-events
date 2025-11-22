import { query } from '$app/server';
import { getRequestEvent } from '$app/server';
import { events } from '$lib/server/db/schema';

/**
 * Fetch all events from the database
 * This is a remote function that can be called from any component
 */
export const getAllEvents = query(async () => {
	const { locals } = getRequestEvent();
	const db = locals.db;

	return await db.select().from(events).all();
});
