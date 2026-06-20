import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { and, gte, lt } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { groupEventsByMonth, getArchiveYears } from '$lib/server/utils/events';

export const load = (async ({ params }) => {
	if (!params.year) error(404, 'Not found');

	const year = parseInt(params.year);
	if (isNaN(year)) error(400, 'Invalid year');

	const yearStart = new Date(year, 0, 1);
	const yearEnd = new Date(year + 1, 0, 1);

	const [data, archiveYears] = await Promise.all([
		db
			.select()
			.from(events)
			.where(and(gte(events.startDate, yearStart), lt(events.startDate, yearEnd))),
		getArchiveYears()
	]);

	if (!data) error(404, 'Not found');

	return {
		eventsByMonth: groupEventsByMonth(data),
		archiveYears,
		year
	};
}) satisfies PageServerLoad;
