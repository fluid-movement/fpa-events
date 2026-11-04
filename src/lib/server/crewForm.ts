import * as v from 'valibot';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { crews } from '#lib/server/db/schema';
import { eventFormSchema } from '#lib/server/eventForm';

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
	v.check(
		(data) => !!(data.city?.trim() && data.country?.trim() && data.latitude && data.longitude),
		'Select a city from the suggestions.'
	),
	v.check((data) => data.name.trim().length > 0, 'Enter a crew name.')
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
