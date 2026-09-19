import { db } from '#lib/server/db';
import { events, eventLocations } from '#lib/server/db/schema';
import { listEventsWithAttendeeCount } from '#lib/server/utils/events';
import { asc, gte, count, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

/** Events shown in the "coming up" grid, on top of the highlighted next one. */
const UPCOMING_LIMIT = 5;

export const load = (async () => {
	const now = new Date();
	const yearStart = new Date(now.getFullYear(), 0, 1);

	const [upcoming, statsRows, mapEvents] = await Promise.all([
		listEventsWithAttendeeCount(gte(events.startDate, now)).limit(UPCOMING_LIMIT + 1),
		db
			.select({
				eventsThisYear: count(),
				countries: sql<number>`count(distinct split_part(${events.location}, ', ', -1))`
			})
			.from(events)
			.where(gte(events.startDate, yearStart)),
		db
			.select({
				id: events.id,
				name: events.name,
				startDate: events.startDate,
				endDate: events.endDate,
				location: events.location,
				eventLocationId: events.eventLocationId,
				latitude: eventLocations.latitude,
				longitude: eventLocations.longitude
			})
			.from(events)
			.leftJoin(eventLocations, eq(events.eventLocationId, eventLocations.id))
			.where(gte(events.startDate, now))
			.orderBy(asc(events.startDate))
	]);

	const [nextEvent, ...moreEvents] = upcoming;

	return {
		nextEvent: nextEvent ?? null,
		upcomingEvents: moreEvents,
		eventsThisYear: statsRows[0]?.eventsThisYear ?? 0,
		countries: statsRows[0]?.countries ?? 0,
		mapEvents
	};
}) satisfies PageServerLoad;
