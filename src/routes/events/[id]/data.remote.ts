import * as v from 'valibot';
import { form, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { events, eventUser } from '#lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireSignedInRequest } from '#lib/server/authz';

/** RSVP on, or off again — the public event page's single write. */
export const toggleRsvp = form(v.object({}), async () => {
	const signedIn = requireSignedInRequest();
	const eventId = getRequestEvent().params.id;
	if (!eventId) error(400, 'Event ID required');

	const [event] = await db.select().from(events).where(eq(events.id, eventId));
	if (!event) error(404, 'Event not found');
	if (event.startDate < new Date()) error(400, 'Cannot RSVP to a past event');

	const [existing] = await db
		.select({ id: eventUser.id })
		.from(eventUser)
		.where(
			and(
				eq(eventUser.eventId, eventId),
				eq(eventUser.userId, signedIn.id),
				eq(eventUser.status, 'attending')
			)
		);

	if (existing) {
		await db.delete(eventUser).where(eq(eventUser.id, existing.id));
	} else {
		await db.insert(eventUser).values({ eventId, userId: signedIn.id, status: 'attending' });
	}
});
