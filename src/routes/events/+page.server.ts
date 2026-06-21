import { db } from '$lib/server/db';
import { events, eventUser } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';
import { asc, gt, count, eq, and, inArray } from 'drizzle-orm';
import { groupEventsByMonth, getArchiveYears } from '$lib/server/utils/events';

export const load = (async ({ locals }) => {
	const [data, archiveYears] = await Promise.all([
		db
			.select({
				id: events.id,
				name: events.name,
				startDate: events.startDate,
				endDate: events.endDate,
				location: events.location,
				eventLocationId: events.eventLocationId,
				description: events.description,
				picture: events.picture,
				pictureWidth: events.pictureWidth,
				pictureHeight: events.pictureHeight,
				userId: events.userId,
				createdAt: events.createdAt,
				updatedAt: events.updatedAt,
				attendeeCount: count(eventUser.id)
			})
			.from(events)
			.leftJoin(
				eventUser,
				and(eq(eventUser.eventId, events.id), eq(eventUser.status, 'attending'))
			)
			.where(gt(events.startDate, new Date()))
			.groupBy(events.id)
			.orderBy(asc(events.startDate)),
		getArchiveYears()
	]);

	let statusMap = new Map<string, string>();
	if (locals.user && data.length > 0) {
		const eventIds = data.map((e) => e.id);
		const userStatuses = await db
			.select({ eventId: eventUser.eventId, status: eventUser.status })
			.from(eventUser)
			.where(and(eq(eventUser.userId, locals.user.id), inArray(eventUser.eventId, eventIds)));
		statusMap = new Map(userStatuses.map((r) => [r.eventId, r.status]));
	}

	const eventsWithStatus = data.map((e) => ({
		...e,
		userStatus: (statusMap.get(e.id) ?? null) as 'attending' | 'organizing' | null
	}));

	return {
		eventsByMonth: groupEventsByMonth(eventsWithStatus),
		archiveYears
	};
}) satisfies PageServerLoad;
