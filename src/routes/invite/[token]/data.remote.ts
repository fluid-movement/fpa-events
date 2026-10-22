import * as v from 'valibot';
import { form, getRequestEvent } from '$app/server';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { eventMagicLinks, eventUser } from '#lib/server/db/schema';
import { requireSignedInRequest } from '#lib/server/authz';

export const acceptInvite = form(
	v.object({ token: v.pipe(v.string(), v.minLength(1)) }),
	async ({ token }) => {
		// Kit's built-in Origin checks run only in production. Require the same
		// origin here too so an invite can never be accepted by a cross-site POST.
		const { request, url } = getRequestEvent();
		if (request.headers.get('origin') !== url.origin) error(403, 'Forbidden');
		const user = requireSignedInRequest();
		// Re-read at submission: the link may have expired or been regenerated since GET.
		const [link] = await db.select().from(eventMagicLinks).where(eq(eventMagicLinks.id, token));
		if (!link) error(404, 'Invite link not found');
		if (new Date(link.expiresAt) <= new Date()) error(410, 'Invite link expired');

		// Explicit acceptance upgrades an RSVP; repeated acceptance keeps one seat.
		await db
			.insert(eventUser)
			.values({ eventId: link.eventId, userId: user.id, status: 'organizing' })
			.onConflictDoUpdate({
				target: [eventUser.eventId, eventUser.userId],
				set: { status: 'organizing', updatedAt: new Date() }
			});

		redirect(303, resolve('/events/[id]', { id: link.eventId }));
	}
);
