import { db } from '$lib/server/db';
import { events, schedules, eventUser } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';
import { error, type ServerLoadEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }: ServerLoadEvent) => {
	if (!params.id) error(404, 'Not found');

	const [event] = await db.select().from(events).where(eq(events.id, params.id));
	if (!event) error(404, 'Not found');

	const [eventSchedules, attendeeCountResult] = await Promise.all([
		db.select().from(schedules).where(eq(schedules.eventId, params.id)),
		db.select({ count: count() }).from(eventUser).where(eq(eventUser.eventId, params.id))
	]);

	return {
		event,
		schedules: eventSchedules,
		attendeeCount: attendeeCountResult[0]?.count ?? 0,
		userId: locals.user?.id ?? null
	};
};
