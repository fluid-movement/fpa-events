import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { and, gte, lt } from 'drizzle-orm';
import { error, type ServerLoadEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { groupEventsByMonth } from '$lib/server/utils/events';

export const load: PageServerLoad = async ({ params }: ServerLoadEvent) => {
	if (!params.year) error(404, 'Not found');

	const year = parseInt(params.year);
	if (isNaN(year)) error(400, 'Invalid year');

	const yearStart = new Date(year, 0, 1);
	const yearEnd = new Date(year + 1, 0, 1);

	const data = await db
		.select()
		.from(events)
		.where(and(gte(events.startDate, yearStart), lt(events.startDate, yearEnd)));

	if (!data) error(404, 'Not found');

	return {
		eventsByMonth: groupEventsByMonth(data),
		year
	};
};
