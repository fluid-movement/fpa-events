import { form, getRequestEvent } from '$app/server';
import { eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { db } from '#lib/server/db';
import { crews } from '#lib/server/db/schema';
import { requireCrewAdmin } from '#lib/server/authz';
import { requireTurnstile } from '#lib/server/turnstile';
import { crewFormSchema, crewConflict } from '#lib/server/crewForm';
import { resolveCityId } from '#lib/server/eventForm';

export const updateCrew = form(crewFormSchema, async (data) => {
	const id = getRequestEvent().params.id;
	if (!id) error(400, 'Crew ID is required');
	await requireCrewAdmin(id);
	await requireTurnstile(data.turnstileToken);
	const cityId = (await resolveCityId(data))!;
	try {
		await db.update(crews).set({ name: data.name.trim(), cityId }).where(eq(crews.id, id));
	} catch (cause) {
		return crewConflict(cause, cityId);
	}
	redirect(303, resolve('/crews/[id]/admin', { id }));
});
