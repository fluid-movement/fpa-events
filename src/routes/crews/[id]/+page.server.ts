import { error } from '@sveltejs/kit';
import { crewExitBlocked } from '#lib/crew-membership-policy';
import { eq, and, asc, count } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { cities, crews, crewMembers, user } from '#lib/server/db/schema';
import { storedIdParam } from '#lib/server/validation';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	const id = storedIdParam(params.id, 'Crew not found');
	const [crew] = await db
		.select({ name: crews.name, city: cities.city, country: cities.country })
		.from(crews)
		.innerJoin(cities, eq(cities.id, crews.cityId))
		.where(eq(crews.id, id))
		.limit(1);
	if (!crew) error(404, 'Crew not found');
	const [namedMembers, counts, ownMembership, roles] = await Promise.all([
		db
			.select({ id: user.id, name: user.name })
			.from(crewMembers)
			.innerJoin(user, eq(user.id, crewMembers.userId))
			.where(and(eq(crewMembers.crewId, id), eq(user.showName, true)))
			.orderBy(asc(crewMembers.createdAt)),
		db.select({ total: count() }).from(crewMembers).where(eq(crewMembers.crewId, id)),
		locals.user
			? db
					.select({ role: crewMembers.role })
					.from(crewMembers)
					.where(and(eq(crewMembers.crewId, id), eq(crewMembers.userId, locals.user.id)))
			: Promise.resolve([]),
		db.select({ role: crewMembers.role }).from(crewMembers).where(eq(crewMembers.crewId, id))
	]);
	const membership = ownMembership[0];
	return {
		crew: { ...crew, id },
		namedMembers,
		hiddenCount: counts[0].total - namedMembers.length,
		isMember: !!membership,
		canManage: membership?.role === 'admin' || locals.role === 'admin',
		leaveBlocked:
			!!membership &&
			crewExitBlocked(
				membership.role,
				roles.filter((m) => m.role === 'admin').length,
				roles.length,
				'leave'
			),
		soleMember: counts[0].total === 1
	};
}) satisfies PageServerLoad;
