import { db } from '$lib/server/db';
import { events, eventUser } from '$lib/server/db/schema';
import { redirect, type ServerLoadEvent } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';
import { asc, desc, eq, gt, lte, count } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }: ServerLoadEvent) => {
	if (!locals.user) {
		redirect(307, resolve('/sign-in'));
	}

	const now = new Date();

	const [upcoming, past] = await Promise.all([
		db.select().from(events).where(eq(events.userId, locals.user.id)).orderBy(asc(events.startDate)),
		db
			.select()
			.from(events)
			.where(eq(events.userId, locals.user.id))
			.orderBy(desc(events.startDate))
	]);

	// Split client-side to avoid two queries with gt/lte
	const upcomingEvents = upcoming.filter((e) => e.startDate >= now);
	const pastEvents = past.filter((e) => e.startDate < now);

	// Get attendee counts for all events
	const allEventIds = [...upcomingEvents, ...pastEvents].map((e) => e.id);

	const attendeeCounts = allEventIds.length
		? await Promise.all(
				allEventIds.map((id) =>
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
		upcoming: upcomingEvents.map((e) => ({ ...e, attendeeCount: countMap[e.id] ?? 0 })),
		past: pastEvents.map((e) => ({ ...e, attendeeCount: countMap[e.id] ?? 0 }))
	};
};
