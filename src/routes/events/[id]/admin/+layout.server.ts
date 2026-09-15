import { db } from '$lib/server/db';
import { events, schedules, eventUser, user, eventMagicLinks } from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { canManageEvent, isEventManager, requireSignedIn } from '$lib/server/authz';
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

	const [event] = await db.select().from(events).where(eq(events.id, params.id));
	if (!event) error(404, 'Not found');

	if (!(await canManageEvent(event, signedIn.id, locals.role))) {
		redirect(307, resolve(`/events/${params.id}`));
	}

	// Co-organizers manage everything except destroying the event.
	const isOwner = isEventManager(event, signedIn.id, locals.role);

	const [attendees, magicLinks, scheduleCounts] = await Promise.all([
		// Shared: the Attendees tab lists these, Invites derives co-organizers from
		// them, and the tab label counts them.
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
		db.select().from(eventMagicLinks).where(eq(eventMagicLinks.eventId, params.id)),
		// The chrome only needs the number; the rows load on the Schedule tab.
		db.select({ value: count() }).from(schedules).where(eq(schedules.eventId, params.id))
	]);

	return {
		// Drives the mobile top bar (see $lib/config/pageTitle).
		title: event.name,
		event,
		isOwner,
		attendees,
		magicLink: magicLinks[0] ?? null,
		scheduleCount: scheduleCounts[0]?.value ?? 0
	};
}) satisfies LayoutServerLoad;
