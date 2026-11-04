import { requireSignedIn } from '#lib/server/authz';
import { db } from '#lib/server/db';
import { crewMembers } from '#lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const user = requireSignedIn(locals);
	const [crewAdmin] = await db
		.select({ crewId: crewMembers.crewId })
		.from(crewMembers)
		.where(and(eq(crewMembers.userId, user.id), eq(crewMembers.role, 'admin')));
	return { isCrewAdmin: !!crewAdmin };
}) satisfies PageServerLoad;
