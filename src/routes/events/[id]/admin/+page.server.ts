import { db } from '$lib/server/db';
import { events, schedules, eventUser, user, eventMagicLinks, eventLocations } from '$lib/server/db/schema';
import { autocomplete } from '$lib/geocoding';
import { eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals, url }) => {
	if (!locals.user) {
		redirect(307, resolve('/sign-in'));
	}

	if (!params.id) error(404, 'Not found');

	const [row] = await db
		.select({ event: events, location: eventLocations })
		.from(events)
		.leftJoin(eventLocations, eq(events.eventLocationId, eventLocations.id))
		.where(eq(events.id, params.id));
	if (!row) error(404, 'Not found');
	const { event, location: eventLocation } = row;

	const isOwner = locals.user.id === event.userId;
	const isAdmin = locals.role === 'admin';
	if (!isOwner && !isAdmin) {
		redirect(307, resolve(`/events/${params.id}`));
	}

	const [eventSchedules, attendees, magicLinks] = await Promise.all([
		db.select().from(schedules).where(eq(schedules.eventId, params.id)).orderBy(schedules.startDate),
		db
			.select({
				id: eventUser.id,
				status: eventUser.status,
				userId: eventUser.userId,
				name: user.name,
				email: user.email
			})
			.from(eventUser)
			.innerJoin(user, eq(eventUser.userId, user.id))
			.where(eq(eventUser.eventId, params.id)),
		db.select().from(eventMagicLinks).where(eq(eventMagicLinks.eventId, params.id))
	]);

	let eventLat = eventLocation?.latitude ?? null;
	let eventLng = eventLocation?.longitude ?? null;

	if ((eventLat === null || eventLng === null) && event.location) {
		const results = await autocomplete(event.location, 1).catch(() => []);
		if (results[0]) {
			eventLat = results[0].lat;
			eventLng = results[0].lng;
		}
	}

	return {
		event,
		eventLat,
		eventLng,
		schedules: eventSchedules,
		attendees,
		magicLink: magicLinks[0] ?? null,
		origin: url.origin
	};
}) satisfies PageServerLoad;
