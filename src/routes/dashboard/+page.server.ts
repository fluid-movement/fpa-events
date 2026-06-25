import { db } from '$lib/server/db';
import { events, eventUser } from '$lib/server/db/schema';
import { resolve } from '$app/paths';
import { redirect, type ServerLoadEvent } from '@sveltejs/kit';
import { eq, and, asc, desc, lte, gt, count } from 'drizzle-orm';
import { ensureCalendarToken } from '$lib/server/utils/calendar';

export const load = async ({ locals }: ServerLoadEvent) => {
	if (!locals.user) {
		redirect(307, resolve('/sign-in'));
	}

	const now = new Date();

	const [attendingUpcoming, attendingPast, calendarToken, allOrganizing] = await Promise.all([
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
			.orderBy(desc(events.startDate)),
		ensureCalendarToken(locals.user.id),
		db.select().from(events).where(eq(events.userId, locals.user.id)).orderBy(asc(events.startDate))
	]);

	const organizingUpcoming = allOrganizing.filter((e) => e.startDate >= now);
	const organizingPast = allOrganizing.filter((e) => e.startDate < now);

	const allOrgIds = allOrganizing.map((e) => e.id);
	const attendeeCounts = allOrgIds.length
		? await Promise.all(
				allOrgIds.map((id) =>
					db
						.select({ count: count() })
						.from(eventUser)
						.where(eq(eventUser.eventId, id))
						.then(([r]) => ({ id, count: r?.count ?? 0 }))
				)
			)
		: [];

	const countMap = Object.fromEntries(attendeeCounts.map(({ id, count }) => [id, count]));

	return {
		attending: {
			upcoming: attendingUpcoming.map((r) => r.event),
			past: attendingPast.map((r) => r.event),
			calendarToken
		},
		organizing: {
			upcoming: organizingUpcoming.map((e) => ({ ...e, attendeeCount: countMap[e.id] ?? 0 })),
			past: organizingPast.map((e) => ({ ...e, attendeeCount: countMap[e.id] ?? 0 }))
		}
	};
};
