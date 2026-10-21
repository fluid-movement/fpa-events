import { and, gte, lt } from 'drizzle-orm';
import { parseArchiveYear } from '#lib/server/validation';
import { events } from '#lib/server/db/schema';
import {
	getArchiveYears,
	groupEventsByMonth,
	listEventsWithAttendeeCount,
	withUserStatus
} from '#lib/server/utils/events';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	const year = parseArchiveYear(params.year);

	const [inYear, archiveYears] = await Promise.all([
		listEventsWithAttendeeCount(
			and(
				gte(events.startDate, new Date(year, 0, 1)),
				lt(events.startDate, new Date(year + 1, 0, 1))
			)
		),
		getArchiveYears()
	]);

	return {
		// Drives the mobile top bar (see #lib/config/pageTitle).
		title: `Past events ${year}`,
		eventsByMonth: groupEventsByMonth(await withUserStatus(inYear, locals.user?.id)),
		archiveYears,
		year
	};
}) satisfies PageServerLoad;
