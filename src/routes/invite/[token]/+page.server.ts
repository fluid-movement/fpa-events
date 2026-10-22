import { db } from '#lib/server/db';
import { eventMagicLinks, events } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { storedIdParam } from '#lib/server/validation';
import type { PageServerLoad } from './$types';

/** Opening or preloading an invite must never change the visitor's membership. */
export const load = (async ({ params, locals }) => {
	const token = storedIdParam(params.token, 'Invite link not found');

	const [link] = await db
		.select({
			eventId: eventMagicLinks.eventId,
			expiresAt: eventMagicLinks.expiresAt,
			eventName: events.name
		})
		.from(eventMagicLinks)
		.innerJoin(events, eq(eventMagicLinks.eventId, events.id))
		.where(eq(eventMagicLinks.id, token));
	if (!link) error(404, 'Invite link not found');

	if (new Date(link.expiresAt) <= new Date()) {
		return { expired: true as const, eventId: link.eventId };
	}

	if (!locals.user) {
		redirect(307, `${resolve('/sign-in')}?redirect=/invite/${token}`);
	}

	return { expired: false as const, eventId: link.eventId, eventName: link.eventName, token };
}) satisfies PageServerLoad;
