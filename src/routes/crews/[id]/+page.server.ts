import { error } from '@sveltejs/kit';
import { getCrewStats } from '#lib/server/crewStats';
import { crewExitBlocked } from '#lib/crew-membership-policy';
import { eq, and, asc, count } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { cities, crews, crewMembers, events, user } from '#lib/server/db/schema';
import { listEventsWithAttendeeCount, splitEventsByEndDate } from '#lib/server/utils/events';
import { storedIdParam } from '#lib/server/validation';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals, url }) => {
	const id = storedIdParam(params.id, 'Crew not found');
	const [crew] = await db
		.select({ name: crews.name, cityId: crews.cityId, city: cities.city, country: cities.country })
		.from(crews)
		.innerJoin(cities, eq(cities.id, crews.cityId))
		.where(eq(crews.id, id))
		.limit(1);
	if (!crew) error(404, 'Crew not found');
	const now = new Date();
	const [namedMembers, counts, ownMembership, roles, cityEvents] = await Promise.all([
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
		db.select({ role: crewMembers.role }).from(crewMembers).where(eq(crewMembers.crewId, id)),
		listEventsWithAttendeeCount(eq(events.cityId, crew.cityId))
	]);
	const { upcoming, past } = splitEventsByEndDate(cityEvents, now);
	const pageSize = 10;
	const requestedPage = Number(url.searchParams.get('pastPage') ?? 1);
	const pastPages = Math.max(1, Math.ceil(past.length / pageSize));
	const pastPage = Number.isSafeInteger(requestedPage)
		? Math.min(pastPages, Math.max(1, requestedPage))
		: 1;
	const membership = ownMembership[0];
	return {
		stats: await getCrewStats(id, crew.cityId, now),
		title: crew.name,
		upcoming,
		past: past.slice((pastPage - 1) * pageSize, pastPage * pageSize),
		pastPage,
		pastPages,
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
