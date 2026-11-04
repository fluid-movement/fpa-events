import * as v from 'valibot';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { crews } from '#lib/server/db/schema';
import { isBodyLanguage } from '#lib/translate';
import { sanitizeRichText, stripHtml } from '#lib/utils/html';
import { text } from '#lib/server/validation';
import { eventFormSchema, type EventFormData } from '#lib/server/eventForm';

const hasCrewCity = (data: Pick<EventFormData, 'city' | 'country' | 'latitude' | 'longitude'>) =>
	!!(data.city?.trim() && data.country?.trim() && data.latitude && data.longitude);
const hasCrewName = (data: { name: string }) => data.name.trim().length > 0;

// Share the event location validation and picker, but require a complete city selection.
export const crewFormSchema = v.pipe(
	v.pick(eventFormSchema.pipe[0], [
		'name',
		'location',
		'city',
		'country',
		'latitude',
		'longitude',
		'turnstileToken'
	]),
	v.check((data) => hasCrewCity(data), 'Select a city from the suggestions.'),
	v.check((data) => hasCrewName(data), 'Enter a crew name.')
);

/** Drizzle wraps postgres errors in `cause`; only translate our uniqueness conflicts. */
export async function crewConflict(
	cause: unknown,
	cityId: number
): Promise<{ error: string; crewId?: string }> {
	const failure = cause instanceof Error && cause.cause ? cause.cause : cause;
	const pg = failure as { code?: string; constraint_name?: string } | null;
	if (pg?.code === '23505' && pg.constraint_name === 'crew_members_user_id_unique') {
		return { error: 'You already belong to a crew.' };
	}
	if (pg?.code === '23505' && pg.constraint_name === 'crews_city_id_unique') {
		const [crew] = await db
			.select({ id: crews.id })
			.from(crews)
			.where(eq(crews.cityId, cityId))
			.limit(1);
		return { error: 'This city already has a crew.', crewId: crew?.id };
	}
	throw cause;
}

export const crewEditSchema = v.pipe(
	v.object({
		...crewFormSchema.pipe[0].entries,
		...v.pick(eventFormSchema.pipe[0], ['picture', 'pictureWidth', 'pictureHeight']).entries,
		body: v.optional(text, ''),
		bodyLang: v.optional(text, '')
	}),
	v.check((data) => hasCrewCity(data), 'Select a city from the suggestions.'),
	v.check((data) => hasCrewName(data), 'Enter a crew name.'),
	v.check(({ body, bodyLang }) => {
		const hasBody = !!stripHtml(sanitizeRichText(body)).trim();
		return hasBody ? isBodyLanguage(bodyLang) : bodyLang === '';
	}, 'Choose a supported language together with body text.')
);
