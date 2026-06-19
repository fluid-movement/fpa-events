import { db } from '$lib/server/db';
import { events, schedules, eventUser } from '$lib/server/db/schema';
import { eq, count, and } from 'drizzle-orm';
import { error, redirect, type ServerLoadEvent } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

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
		userAttending: userRsvp.length > 0
	};
};

export const actions: Actions = {
	rsvp: async ({ params, locals }) => {
		if (!locals.user) redirect(302, '/sign-in');
		if (!params.id) error(404, 'Not found');

		const [existing] = await db
			.select()
			.from(eventUser)
			.where(
				and(
					eq(eventUser.eventId, params.id),
					eq(eventUser.userId, locals.user.id),
					eq(eventUser.status, 'attending')
				)
			);

		if (existing) {
			await db.delete(eventUser).where(eq(eventUser.id, existing.id));
			return { attending: false };
		} else {
			await db.insert(eventUser).values({
				eventId: params.id,
				userId: locals.user.id,
				status: 'attending'
			});
			return { attending: true };
		}
	}
};
