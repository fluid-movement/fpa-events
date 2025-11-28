import * as v from 'valibot';
import { query } from '$app/server';
import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const loadEvent = query(v.string(), async (id) => {
	const event = await db.select().from(events).where(eq(events.id, id));
	
	if (!event) error(404, 'Not found');
	
	return event[0];
});
