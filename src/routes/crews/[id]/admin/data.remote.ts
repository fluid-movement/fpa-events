import { form, getRequestEvent } from '$app/server';
import { eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { crews } from '#lib/server/db/schema';
import { requireCrewAdmin } from '#lib/server/authz';
import { requireTurnstile } from '#lib/server/turnstile';
import { crewEditSchema, crewConflict } from '#lib/server/crewForm';
import { sanitizeRichText, stripHtml } from '#lib/utils/html';
import { withPictureLock } from '#lib/server/picture-storage';
import { resolveCityId, parsePictureFields, releasePicture } from '#lib/server/eventForm';

export const updateCrew = form(crewEditSchema, async (data) => {
	const id = getRequestEvent().params.id;
	if (!id) error(400, 'Crew ID is required');
	const existing = await requireCrewAdmin(id);
	await requireTurnstile(data.turnstileToken);
	const cityId = (await resolveCityId(data))!;
	try {
		await withPictureLock(data.picture || existing.picture, async (tx) => {
			const picture = await parsePictureFields(data, existing, id, tx, 'crew');
			const body = sanitizeRichText(data.body);
			await tx
				.update(crews)
				.set({
					name: data.name.trim(),
					cityId,
					...picture,
					body: stripHtml(body).trim() ? body : null,
					bodyLang: data.bodyLang || null
				})
				.where(eq(crews.id, id));
		});
	} catch (cause) {
		return crewConflict(cause, cityId);
	}
	if (existing.picture && data.picture !== undefined && data.picture !== existing.picture) {
		await releasePicture(existing.picture, id, 'crew').catch(() => {});
	}
	redirect(303, resolve('/crews/[id]/admin', { id }));
});
