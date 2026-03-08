import { db } from '$lib/server/db';
import { eventMagicLinks, eventUser } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { token } = params;

	const [link] = await db.select().from(eventMagicLinks).where(eq(eventMagicLinks.id, token));
	if (!link) error(404, 'Invite link not found');

	if (new Date(link.expiresAt) < new Date()) {
		return { expired: true, eventId: link.eventId };
	}

	if (!locals.user) {
		redirect(307, `${resolve('/sign-in')}?redirect=/invite/${token}`);
	}

	const [existing] = await db
		.select()
		.from(eventUser)
		.where(and(eq(eventUser.eventId, link.eventId), eq(eventUser.userId, locals.user.id)));

	if (existing) {
		if (existing.status !== 'organizing') {
			await db
				.update(eventUser)
				.set({ status: 'organizing' })
				.where(eq(eventUser.id, existing.id));
		}
	} else {
		await db.insert(eventUser).values({
			eventId: link.eventId,
			userId: locals.user.id,
			status: 'organizing'
		});
	}

	redirect(303, resolve(`/events/${link.eventId}`));
};
