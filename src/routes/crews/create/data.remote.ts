import { form } from '$app/server';
import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { ulid } from 'ulid';
import { db } from '#lib/server/db';
import { crews, crewMembers } from '#lib/server/db/schema';
import { requireSignedInRequest } from '#lib/server/authz';
import { requireTurnstile } from '#lib/server/turnstile';
import { crewFormSchema, crewConflict } from '#lib/server/crewForm';
import { resolveCityId } from '#lib/server/eventForm';

export const createCrew = form(crewFormSchema, async (data) => {
	const signedIn = requireSignedInRequest();
	await requireTurnstile(data.turnstileToken);
	const cityId = (await resolveCityId(data))!;
	const id = ulid().toLowerCase();
	try {
		await db.transaction(async (tx) => {
			await tx.insert(crews).values({ id, name: data.name.trim(), cityId });
			await tx.insert(crewMembers).values({ crewId: id, userId: signedIn.id, role: 'admin' });
		});
	} catch (cause) {
		return crewConflict(cause, cityId);
	}
	redirect(303, resolve('/crews/[id]/admin', { id }));
});
