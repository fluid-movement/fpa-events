import * as v from 'valibot';
import { form, getRequestEvent } from '$app/server';
import { eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { db } from '#lib/server/db';
import { crewMagicLinks, crewMembers } from '#lib/server/db/schema';
import { requireSignedInRequest } from '#lib/server/authz';
import { text } from '#lib/server/validation';
import { assertCrewExit, removeCrewSeat, withCrewMembership } from '#lib/server/crew-membership';

export const acceptInvite = form(
	v.object({ token: text, previousCrewId: v.string() }),
	async ({ token, previousCrewId }) => {
		const signedIn = requireSignedInRequest();
		const { request, url } = getRequestEvent();
		if (request.headers.get('origin') !== url.origin) error(403, 'Forbidden');
		const [preview] = await db.select().from(crewMagicLinks).where(eq(crewMagicLinks.id, token));
		if (!preview) error(404, 'Invite link not found');
		const crewId = await withCrewMembership(signedIn.id, [preview.crewId], async (tx, current) => {
			// Link validity and membership are checked again under the crew locks.
			const [link] = await tx.select().from(crewMagicLinks).where(eq(crewMagicLinks.id, token));
			if (!link) error(404, 'Invite link not found');
			if (link.expiresAt <= new Date()) error(410, 'Invite link expired');
			if (current?.crewId === link.crewId) return link.crewId;
			if ((current?.crewId ?? '') !== previousCrewId)
				error(409, 'Your crew changed. Open the invitation again to confirm.');
			if (current) {
				await assertCrewExit(tx, current, 'switch');
				await removeCrewSeat(tx, current);
			}
			await tx
				.insert(crewMembers)
				.values({ crewId: link.crewId, userId: signedIn.id, role: 'member' });
			return link.crewId;
		});
		redirect(303, resolve('/crews/[id]', { id: crewId }));
	}
);
