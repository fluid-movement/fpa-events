import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { asc, gte } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const data = await db
		.select()
		.from(events)
		.where(gte(events.startDate, new Date()))
		.orderBy(asc(events.startDate))
		.limit(1);

	if (!data) error(404, 'Not found');

	return {
		nextEvent: data[0]
	};
};
