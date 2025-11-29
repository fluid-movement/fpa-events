import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { asc } from 'drizzle-orm';
import { groupEventsByMonth } from '$lib/server/utils/events';

export const load: PageServerLoad = async () => {
	const data = await db.select().from(events).orderBy(asc(events.startDate));

	if (!data) error(404, 'Not found');

	return {
		eventsByMonth: groupEventsByMonth(data)
	};
};
