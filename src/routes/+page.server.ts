import { db } from '$lib/server/db';
import { events, eventUser } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';
import { asc, gte, count, eq, and, sql, countDistinct } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const now = new Date();
	const yearStart = new Date(now.getFullYear(), 0, 1);

	const [upcoming, statsRows] = await Promise.all([
		db
			.select({
				id: events.id,
				name: events.name,
				startDate: events.startDate,
				endDate: events.endDate,
				location: events.location,
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
			.where(gte(events.startDate, now))
			.groupBy(events.id)
			.orderBy(asc(events.startDate))
			.limit(6),
		db
			.select({
				eventsThisYear: count(),
				countries: sql<number>`count(distinct split_part(${events.location}, ', ', -1))`
			})
			.from(events)
			.where(gte(events.startDate, yearStart))
	]);

	const [nextEvent, ...moreEvents] = upcoming;

	return {
		nextEvent: nextEvent ?? null,
		upcomingEvents: moreEvents.slice(0, 5),
		eventsThisYear: statsRows[0]?.eventsThisYear ?? 0,
		countries: statsRows[0]?.countries ?? 0
	};
};
