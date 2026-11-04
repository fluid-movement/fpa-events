import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { cities } from '#lib/server/db/schema';
import { requireCrewAdmin, requireSignedIn } from '#lib/server/authz';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params }) => {
	requireSignedIn(locals);
	const crew = await requireCrewAdmin(params.id);
	const [city] = await db.select().from(cities).where(eq(cities.id, crew.cityId)).limit(1);
	return { crew, city };
}) satisfies PageServerLoad;
