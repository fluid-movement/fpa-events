import { db } from '$lib/server/db';
import { events, schedules, scheduleLocations, eventUser, user } from '$lib/server/db/schema';
import { eq, count, and, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { sanitizeRichText } from '$lib/utils/html';

const ATTENDEE_PEEK_LIMIT = 4;

export const load = (async ({ params, locals }) => {
	if (!params.id) error(404, 'Not found');

	const [event] = await db.select().from(events).where(eq(events.id, params.id));
	if (!event) error(404, 'Not found');

	const [eventSchedules, attendeeCountResult, userRsvp, attendeePeek] = await Promise.all([
		db
			.select({
				id: schedules.id,
				eventId: schedules.eventId,
				name: schedules.name,
				startDate: schedules.startDate,
				endDate: schedules.endDate,
				description: schedules.description,
				locationId: schedules.locationId,
				locationName: scheduleLocations.name,
				createdAt: schedules.createdAt,
				updatedAt: schedules.updatedAt
			})
			.from(schedules)
			.leftJoin(scheduleLocations, eq(schedules.locationId, scheduleLocations.id))
			.where(eq(schedules.eventId, params.id))
			.orderBy(asc(schedules.startDate)),
		db
			.select({ count: count() })
			.from(eventUser)
			.where(and(eq(eventUser.eventId, params.id), eq(eventUser.status, 'attending'))),
		locals.user
			? db
					.select()
					.from(eventUser)
					.where(
						and(
							eq(eventUser.eventId, params.id),
							eq(eventUser.userId, locals.user.id),
							eq(eventUser.status, 'attending')
						)
					)
			: Promise.resolve([]),
		db
			.select({ name: user.name, image: user.image })
			.from(eventUser)
			.innerJoin(user, eq(eventUser.userId, user.id))
			.where(and(eq(eventUser.eventId, params.id), eq(eventUser.status, 'attending')))
			.orderBy(asc(eventUser.createdAt))
			.limit(ATTENDEE_PEEK_LIMIT)
	]);

	return {
		event: {
			...event,
			description: event.description ? sanitizeRichText(event.description) : null
		},
		schedules: eventSchedules,
		attendeeCount: attendeeCountResult[0]?.count ?? 0,
		attendeePeek,
		userId: locals.user?.id ?? null,
		userRole: locals.role ?? null,
		userAttending: userRsvp.length > 0
	};
}) satisfies PageServerLoad;
