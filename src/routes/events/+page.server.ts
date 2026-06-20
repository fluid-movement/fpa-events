import { db } from '$lib/server/db';
import { events, eventUser } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';
import { asc, gt, count, eq, and } from 'drizzle-orm';
import { groupEventsByMonth, getArchiveYears } from '$lib/server/utils/events';

export const load: PageServerLoad = async () => {
	const [data, archiveYears] = await Promise.all([
		db
			.select({
				id: events.id,
				name: events.name,
				startDate: events.startDate,
				endDate: events.endDate,
				location: events.location,
				city: events.city,
				country: events.country,
				latitude: events.latitude,
				longitude: events.longitude,
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

	return {
		eventsByMonth: groupEventsByMonth(data),
		archiveYears
	};
};
