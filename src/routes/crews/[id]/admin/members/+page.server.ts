import { eq, asc } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { db } from '#lib/server/db';
import { crewMagicLinks, crewMembers, user } from '#lib/server/db/schema';
import { requireCrewAdmin, requireSignedIn } from '#lib/server/authz';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	requireSignedIn(locals);
	const crew = await requireCrewAdmin(params.id);
	const [members, links] = await Promise.all([
		db
			.select({ userId: user.id, name: user.name, role: crewMembers.role })
			.from(crewMembers)
			.innerJoin(user, eq(user.id, crewMembers.userId))
			.where(eq(crewMembers.crewId, crew.id))
			.orderBy(asc(crewMembers.createdAt)),
		db
			.select()
			.from(crewMagicLinks)
			.where(eq(crewMagicLinks.crewId, crew.id))
			.orderBy(asc(crewMagicLinks.createdAt))
	]);
	return {
		crew,
		members,
		links: links.map((link) => ({
			...link,
			url: url.origin + resolve('/crews/join/[token]', { token: link.id })
		}))
	};
}) satisfies PageServerLoad;
