import { asc, count, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { cities, crews, crewMembers } from '#lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load = (async () => {
	const rows = await db
		.select({
			id: crews.id,
			name: crews.name,
			city: cities.city,
			country: cities.country,
			latitude: cities.latitude,
			longitude: cities.longitude,
			memberCount: count(crewMembers.userId)
		})
		.from(crews)
		.innerJoin(cities, eq(cities.id, crews.cityId))
		.leftJoin(crewMembers, eq(crewMembers.crewId, crews.id))
		.groupBy(crews.id, cities.id)
		.orderBy(asc(cities.country), asc(cities.city), asc(crews.name));
	return { crews: rows };
}) satisfies PageServerLoad;
