import { db } from '$lib/server/db';
import { events, eventUser } from '$lib/server/db/schema';
import { resolve } from '$app/paths';
import { redirect, type ServerLoadEvent } from '@sveltejs/kit';
import { eq, and, asc, desc, lte, gt } from 'drizzle-orm';

export const load = async ({ locals }: ServerLoadEvent) => {
	if (!locals.user) {
		redirect(307, resolve('/sign-in'));
	}

	const now = new Date();

	const [upcoming, past] = await Promise.all([
		db
			.select({ event: events })
			.from(eventUser)
			.innerJoin(events, eq(eventUser.eventId, events.id))
			.where(
				and(
					eq(eventUser.userId, locals.user.id),
					eq(eventUser.status, 'attending'),
					gt(events.startDate, now)
				)
			)
			.orderBy(asc(events.startDate)),
		db
			.select({ event: events })
			.from(eventUser)
			.innerJoin(events, eq(eventUser.eventId, events.id))
			.where(
				and(
					eq(eventUser.userId, locals.user.id),
					eq(eventUser.status, 'attending'),
					lte(events.startDate, now)
				)
			)
			.orderBy(desc(events.startDate))
	]);

	return {
		upcoming: upcoming.map((r) => r.event),
		past: past.map((r) => r.event)
	};
};
