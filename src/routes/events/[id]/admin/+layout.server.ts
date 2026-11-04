import { db } from '#lib/server/db';
import {
	events,
	schedules,
	eventUser,
	user,
	eventMagicLinks,
	cities,
	crews,
	crewMembers
} from '#lib/server/db/schema';
import { and, count, eq, notExists, sql } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { canManageEvent, isEventManager, requireSignedIn } from '#lib/server/authz';
import { storedIdParam } from '#lib/server/validation';
import type { LayoutServerLoad } from './$types';

/**
 * Guard and shared data for the whole manage area.
 *
 * Only what the chrome (header, tab counts, setup checklist) or more than one tab
 * needs lives here. Per-tab data — schedule rows, and the geocoding fallback for
 * the venue picker — belongs to the child routes.
 */
export const load = (async ({ params, locals }) => {
	// Not `user`: that name belongs to the schema table imported above.
	const signedIn = requireSignedIn(locals);
	// Before the query builder exists, so a malformed id never reaches it.
	const id = storedIdParam(params.id);

	const [event] = await db.select().from(events).where(eq(events.id, id));
	if (!event) error(404, 'Not found');

	if (!(await canManageEvent(event, signedIn.id, locals.role))) {
		redirect(307, resolve('/events/[id]', { id: params.id }));
	}

	// Co-organizers manage everything except destroying the event.
	const isOwner = isEventManager(event, signedIn.id, locals.role);

	const [attendees, magicLinks, scheduleCounts, crewCardCities] = await Promise.all([
		// Shared: the Attendees tab lists these, Invites derives co-organizers from
		// them, and the tab label counts them.
		db
			.select({
				id: eventUser.id,
				status: eventUser.status,
				userId: eventUser.userId,
				name: user.name,
				// Invite holders may see names, but only owners/admins receive addresses.
				email: isOwner ? user.email : sql<null>`null`
			})
			.from(eventUser)
			.innerJoin(user, eq(eventUser.userId, user.id))
			.where(eq(eventUser.eventId, params.id)),
		db.select().from(eventMagicLinks).where(eq(eventMagicLinks.eventId, params.id)),
		// The chrome only needs the number; the rows load on the Schedule tab.
		db.select({ value: count() }).from(schedules).where(eq(schedules.eventId, params.id)),
		// Shared by every tab; no city means there is nothing to suggest.
		event.cityId === null
			? Promise.resolve([])
			: db
					.select({ id: cities.id })
					.from(cities)
					.where(
						and(
							eq(cities.id, event.cityId),
							notExists(db.select({ id: crews.id }).from(crews).where(eq(crews.cityId, cities.id))),
							notExists(
								db
									.select({ userId: crewMembers.userId })
									.from(crewMembers)
									.where(eq(crewMembers.userId, signedIn.id))
							)
						)
					)
	]);

	return {
		// Drives the mobile top bar (see #lib/config/pageTitle).
		title: event.name,
		event,
		isOwner,
		crewCard: crewCardCities[0] ?? null,
		attendees,
		magicLink: magicLinks[0] ?? null,
		scheduleCount: scheduleCounts[0]?.value ?? 0
	};
}) satisfies LayoutServerLoad;
