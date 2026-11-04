import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { cities, crewJams } from '#lib/server/db/schema';
import { requireCrewAdmin, requireSignedIn } from '#lib/server/authz';
import { sortJams } from '#lib/crew-jams';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params }) => {
	requireSignedIn(locals);
	const crew = await requireCrewAdmin(params.id);
	const [city] = await db.select().from(cities).where(eq(cities.id, crew.cityId));
	const jams = await db.select().from(crewJams).where(eq(crewJams.crewId, crew.id));
	return { crew, city, jams: sortJams(jams) };
}) satisfies PageServerLoad;
