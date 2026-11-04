import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { cities, crews } from '#lib/server/db/schema';
import { storedIdParam } from '#lib/server/validation';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
	const id = storedIdParam(params.id, 'Crew not found');
	const [crew] = await db.select({ name: crews.name, city: cities.city, country: cities.country })
		.from(crews).innerJoin(cities, eq(cities.id, crews.cityId)).where(eq(crews.id, id)).limit(1);
	if (!crew) error(404, 'Crew not found');
	return { crew };
}) satisfies PageServerLoad;
