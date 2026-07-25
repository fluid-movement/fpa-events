import { db } from '$lib/server/db';
import { events, eventUser } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';
import { and, asc, eq, count, inArray, or } from 'drizzle-orm';

export const load = (async ({ locals }) => {
	if (!locals.user) {
		redirect(307, resolve('/sign-in'));
	}

	const userId = locals.user.id;
	const now = new Date();

	// Events the user created, plus events they co-organize via an accepted invite.
	const coOrganizing = await db
		.select({ eventId: eventUser.eventId })
		.from(eventUser)
		.where(and(eq(eventUser.userId, userId), eq(eventUser.status, 'organizing')));

	const coOrganizingIds = coOrganizing.map((r) => r.eventId);

	const allEvents = await db
		.select()
		.from(events)
		.where(
			coOrganizingIds.length
				? or(eq(events.userId, userId), inArray(events.id, coOrganizingIds))
				: eq(events.userId, userId)
		)
		.orderBy(asc(events.startDate));

	// Split client-side to avoid two queries with gt/lte
	const upcomingEvents = allEvents.filter((e) => e.startDate >= now);
	const pastEvents = allEvents.filter((e) => e.startDate < now).reverse();

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

	const decorate = (e: (typeof allEvents)[number]) => ({
		...e,
		attendeeCount: countMap[e.id] ?? 0,
		isOwner: e.userId === userId
	});

	return {
		upcoming: upcomingEvents.map(decorate),
		past: pastEvents.map(decorate)
	};
}) satisfies PageServerLoad;
