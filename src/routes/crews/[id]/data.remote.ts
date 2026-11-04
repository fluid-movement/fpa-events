import * as v from 'valibot';
import { form } from '$app/server';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { requireSignedInRequest } from '#lib/server/authz';
import { text } from '#lib/server/validation';
import { assertCrewExit, removeCrewSeat, withCrewMembership } from '#lib/server/crew-membership';

export const leaveCrew = form(v.object({ crewId: text }), async ({ crewId }) => {
	const user = requireSignedInRequest();
	await withCrewMembership(user.id, [crewId], async (tx, membership) => {
		if (!membership || membership.crewId !== crewId) error(404, 'Membership not found');
		await assertCrewExit(tx, membership, 'leave');
		await removeCrewSeat(tx, membership);
	});
	redirect(303, resolve('/'));
});
