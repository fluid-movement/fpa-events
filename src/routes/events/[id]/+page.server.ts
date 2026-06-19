import { db } from '$lib/server/db';
import { events, schedules, eventUser } from '$lib/server/db/schema';
import { eq, count, and } from 'drizzle-orm';
import { error, type ServerLoadEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }: ServerLoadEvent) => {
	if (!params.id) error(404, 'Not found');

	const [event] = await db.select().from(events).where(eq(events.id, params.id));
	if (!event) error(404, 'Not found');

	const [eventSchedules, attendeeCountResult, userRsvp] = await Promise.all([
		db.select().from(schedules).where(eq(schedules.eventId, params.id)),
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
			: Promise.resolve([])
	]);

	return {
		event,
		schedules: eventSchedules,
		attendeeCount: attendeeCountResult[0]?.count ?? 0,
		userId: locals.user?.id ?? null,
		userRole: locals.role ?? null,
		userAttending: userRsvp.length > 0
	};
};
