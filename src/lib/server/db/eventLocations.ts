import { db } from '#lib/server/db';
import { eventLocations } from '#lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';

/** Two coordinates this close (about 11 m) are the same place; `real` is lossy. */
const SAME_PLACE_DEGREES = 0.0001;

/**
 * The location row for a city at exactly these coordinates, created if absent.
 *
 * Rows are shared between events, so the coordinates are part of the key: a
 * client that is first to submit a city must not decide where every later event
 * in that city is pinned. A submission with different coordinates gets its own
 * row and an existing row is never moved. Callers must have validated the
 * coordinates as finite and in range.
 */
export async function findOrCreateEventLocation(
	city: string,
	country: string,
	latitude: number,
	longitude: number
): Promise<number> {
	const [existing] = await db
		.select()
		.from(eventLocations)
		.where(
			and(
				eq(eventLocations.city, city),
				eq(eventLocations.country, country),
				sql`abs(${eventLocations.latitude} - ${latitude}) < ${SAME_PLACE_DEGREES}`,
				sql`abs(${eventLocations.longitude} - ${longitude}) < ${SAME_PLACE_DEGREES}`
			)
		)
		.limit(1);
	if (existing) return existing.id;
	const [created] = await db
		.insert(eventLocations)
		.values({ city, country, latitude, longitude })
		.returning();
	return created.id;
}
