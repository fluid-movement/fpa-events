import * as v from 'valibot';
import { form, getRequestEvent } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { db } from '$lib/server/db';
import { eventUser } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const toggleRsvp = form(v.object({}), async () => {
	const { locals, params } = getRequestEvent();

	if (!locals.user) redirect(302, resolve('/sign-in'));

	const eventId = params.id;
	if (!eventId) throw new Error('Event ID required');

	const [existing] = await db
		.select()
		.from(eventUser)
		.where(
			and(
				eq(eventUser.eventId, eventId),
				eq(eventUser.userId, locals.user.id),
				eq(eventUser.status, 'attending')
			)
		);

	if (existing) {
		await db.delete(eventUser).where(eq(eventUser.id, existing.id));
	} else {
		await db.insert(eventUser).values({
			eventId,
			userId: locals.user.id,
			status: 'attending'
		});
	}
});
