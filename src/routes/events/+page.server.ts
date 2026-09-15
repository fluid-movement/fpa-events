import { gt } from 'drizzle-orm';
import { events } from '$lib/server/db/schema';
import {
	getArchiveYears,
	groupEventsByMonth,
	listEventsWithAttendeeCount,
	withUserStatus
} from '$lib/server/utils/events';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const [upcoming, archiveYears] = await Promise.all([
		listEventsWithAttendeeCount(gt(events.startDate, new Date())),
		getArchiveYears()
	]);

	return {
		eventsByMonth: groupEventsByMonth(await withUserStatus(upcoming, locals.user?.id)),
		archiveYears
	};
}) satisfies PageServerLoad;
