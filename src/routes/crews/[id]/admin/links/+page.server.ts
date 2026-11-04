import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { crewLinks } from '#lib/server/db/schema';
import { requireCrewAdmin, requireSignedIn } from '#lib/server/authz';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params }) => {
	requireSignedIn(locals);
	const crew = await requireCrewAdmin(params.id);
	const links = await db.select().from(crewLinks).where(eq(crewLinks.crewId, crew.id));
	return { crew, links };
}) satisfies PageServerLoad;
