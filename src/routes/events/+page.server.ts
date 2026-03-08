import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { asc, gt } from 'drizzle-orm';
import { groupEventsByMonth, getArchiveYears } from '$lib/server/utils/events';

export const load: PageServerLoad = async () => {
	const [data, archiveYears] = await Promise.all([
		db.select().from(events).where(gt(events.startDate, new Date())).orderBy(asc(events.startDate)),
		getArchiveYears()
	]);

	if (!data) error(404, 'Not found');

	return {
		eventsByMonth: groupEventsByMonth(data),
		archiveYears
	};
};
