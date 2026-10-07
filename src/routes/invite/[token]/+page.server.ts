import { db } from '#lib/server/db';
import { eventMagicLinks, eventUser } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	const { token } = params;

	const [link] = await db.select().from(eventMagicLinks).where(eq(eventMagicLinks.id, token));
	if (!link) error(404, 'Invite link not found');

	if (new Date(link.expiresAt) < new Date()) {
		return { expired: true, eventId: link.eventId };
	}

	if (!locals.user) {
		redirect(307, `${resolve('/sign-in')}?redirect=/invite/${token}`);
	}

	// An existing RSVP becomes an organizer seat; one row per (event, user).
	await db
		.insert(eventUser)
		.values({ eventId: link.eventId, userId: locals.user.id, status: 'organizing' })
		.onConflictDoUpdate({
			target: [eventUser.eventId, eventUser.userId],
			set: { status: 'organizing', updatedAt: new Date() }
		});

	redirect(303, resolve('/events/[id]', { id: link.eventId }));
}) satisfies PageServerLoad;
